import { ApiResponse, ApiError, ApiErrorType } from '@/types';
import { carparkApiLimiter, authApiLimiter, predictionApiLimiter } from '@/utils/rateLimiter';

// Default configuration
const DEFAULT_TIMEOUT = 10000; // 10 seconds
const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

// Request configuration interface
interface RequestConfig extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

// Error handler utility
export class ErrorHandler {
  static handleApiError(error: unknown): ApiError {
    if (error instanceof TypeError) {
      // Check if it's a CORS error
      if (error.message.includes('CORS') || error.message.includes('cross-origin')) {
        return {
          type: ApiErrorType.NETWORK_ERROR,
          message: 'CORS error: Unable to access external API from browser.',
          retryable: false,
        };
      }
      return {
        type: ApiErrorType.NETWORK_ERROR,
        message: 'Network error. Please check your connection.',
        retryable: true,
      };
    }

    if (error instanceof Response) {
      switch (error.status) {
        case 401:
          return {
            type: ApiErrorType.AUTHENTICATION_ERROR,
            message: 'Please log in to continue.',
            retryable: false,
          };
        case 403:
          return {
            type: ApiErrorType.AUTHORIZATION_ERROR,
            message: "You don't have permission for this action.",
            retryable: false,
          };
        case 404:
          return {
            type: ApiErrorType.SERVER_ERROR,
            message: 'The requested resource was not found.',
            retryable: false,
          };
        case 408:
          return {
            type: ApiErrorType.TIMEOUT_ERROR,
            message: 'Request timed out. Please try again.',
            retryable: true,
          };
        case 500:
        case 502:
        case 503:
        case 504:
          return {
            type: ApiErrorType.SERVER_ERROR,
            message: 'Server error. Please try again later.',
            retryable: true,
          };
        default:
          return {
            type: ApiErrorType.UNKNOWN_ERROR,
            message: 'An unexpected error occurred.',
            retryable: false,
          };
      }
    }

    return {
      type: ApiErrorType.UNKNOWN_ERROR,
      message: 'Something went wrong. Please try again.',
      retryable: false,
    };
  }

  static getErrorMessage(error: ApiError): string {
    return error.message;
  }

  static shouldRetry(error: ApiError): boolean {
    return error.retryable;
  }
}

// Request deduplication
class RequestDeduplicator {
  private pendingRequests = new Map<string, Promise<any>>();

  async deduplicate<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }

    const promise = requestFn().finally(() => {
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }
}

// Centralized HTTP client
class ApiClient {
  private deduplicator = new RequestDeduplicator();
  constructor() {
    // Constructor for future extensibility
  }

  // Request interceptor
  private async interceptRequest(url: string, config: RequestConfig): Promise<[string, RequestConfig]> {
    // If headers are explicitly set to empty object, respect that (like original carpark API)
    const useEmptyHeaders = config.headers && Object.keys(config.headers).length === 0;

    const finalConfig: RequestConfig = {
      ...config,
      headers: useEmptyHeaders ? {} : {
        ...DEFAULT_HEADERS,
        ...config.headers,
      },
      // Add CORS mode for cross-origin requests
      mode: 'cors',
    };

    return [url, finalConfig];
  }

  // Response interceptor
  private async interceptResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      throw response;
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }

    return response.text() as T;
  }

  // Retry logic with exponential backoff
  private async withRetry<T>(
    requestFn: () => Promise<T>,
    retries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    try {
      return await requestFn();
    } catch (error) {
      const apiError = ErrorHandler.handleApiError(error);

      if (retries > 0 && ErrorHandler.shouldRetry(apiError)) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.withRetry(requestFn, retries - 1, delay * 2);
      }

      throw apiError;
    }
  }

  // Timeout wrapper
  private withTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      ),
    ]);
  }

  // Main request method
  async request<T>(
    url: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const {
      timeout = DEFAULT_TIMEOUT,
      retries = 3,
      retryDelay = 1000,
      ...fetchConfig
    } = config;

    const requestKey = `${config.method || 'GET'}:${url}:${JSON.stringify(config.body || {})}`;

    // Check rate limiting
    const rateLimiter = this.getRateLimiter(url);
    if (!rateLimiter.isAllowed(url)) {
      return {
        data: {} as T,
        success: false,
        error: 'Rate limit exceeded. Please try again later.',
        metadata: {
          timestamp: new Date(),
          source: 'rate-limiter',
          cached: false,
        },
      };
    }

    try {
      const result = await this.deduplicator.deduplicate(requestKey, async () => {
        const [finalUrl, finalConfig] = await this.interceptRequest(url, fetchConfig);

        // Handle prediction URL requests

        return this.withRetry(async () => {
          const response = await this.withTimeout(
            fetch(finalUrl, finalConfig),
            timeout
          );
          return this.interceptResponse<T>(response);
        }, retries, retryDelay);
      });

      return {
        data: result,
        success: true,
        metadata: {
          timestamp: new Date(),
          source: 'api',
          cached: false,
        },
      };
    } catch (error) {
      const apiError = ErrorHandler.handleApiError(error);

      console.error('API request failed:', apiError);

      return {
        data: {} as T,
        success: false,
        error: apiError.message,
        metadata: {
          timestamp: new Date(),
          source: 'api',
          cached: false,
        },
      };
    }
  }

  // Convenience methods
  async get<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: 'GET' });
  }

  async post<T>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      ...config,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      ...config,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: 'DELETE' });
  }

  // Get appropriate rate limiter based on URL
  private getRateLimiter(url: string) {
    if (url.includes('login') || url.includes('signup') || url.includes('update')) {
      return authApiLimiter;
    }
    if (url.includes('predictor') || url.includes('predict')) {
      return predictionApiLimiter;
    }
    return carparkApiLimiter;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();