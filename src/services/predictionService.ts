import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';

// Simple request deduplication for predictions
class PredictionDeduplicator {
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

const predictionDeduplicator = new PredictionDeduplicator();

/**
 * Prediction Service for carpark availability forecasting
 * Integrates with AWS Lambda prediction API to provide 24-hour availability forecasts
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Request payload for prediction API
 */
export interface PredictionRequest {
  carpark_number: string;
  datetime: string; // ISO 8601 format
}

/**
 * Raw prediction data from API
 */
export interface PredictionApiResponse {
  carpark_number: string;
  predictions: Array<{
    datetime: string;
    predicted_lots_available: number;
  }>;
}

/**
 * Enhanced prediction data with analysis
 */
export interface EnhancedPrediction {
  datetime: string;
  predicted_lots_available: number;
  availability_percentage: number;
  status: 'excellent' | 'good' | 'limited' | 'very_limited';
  is_optimal_time: boolean;
  is_peak_time: boolean;
  confidence_level: 'high' | 'medium' | 'low';
}

/**
 * Prediction analysis and insights
 */
export interface PredictionAnalysis {
  best_times: Array<{
    time: string;
    availability: number;
    reason: string;
  }>;
  worst_times: Array<{
    time: string;
    availability: number;
    reason: string;
  }>;
  insights: string[];
  overall_trend: 'improving' | 'declining' | 'stable';
}

/**
 * Complete prediction response with analysis
 */
export interface PredictionResponse {
  carpark_number: string;
  predictions: EnhancedPrediction[];
  analysis: PredictionAnalysis;
  metadata: {
    generated_at: string;
    expires_at: string;
    total_lots?: number;
  };
}

/**
 * Service response wrapper
 */
export interface PredictionServiceResponse {
  data?: PredictionResponse;
  error?: string;
  cached?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// Availability thresholds for status classification
const AVAILABILITY_THRESHOLDS = {
  EXCELLENT: 80, // 80%+ availability
  GOOD: 60,      // 60-79% availability
  LIMITED: 30,   // 30-59% availability
  VERY_LIMITED: 0 // 0-29% availability
} as const;

// ============================================================================
// Prediction Service Class
// ============================================================================

export class PredictionService {
  /**
   * Get 24-hour availability predictions for a carpark
   */
  static async getPredictions(carparkNumber: string, totalLots?: number): Promise<PredictionServiceResponse> {
    const deduplicationKey = `prediction-${carparkNumber}`;

    return predictionDeduplicator.deduplicate(deduplicationKey, async () => {
      try {
        // Fetching predictions for carpark

        // Fetch fresh predictions from API
        const apiResponse = await this.fetchPredictionsFromAPI(carparkNumber);
        if (apiResponse.error) {
          return { error: apiResponse.error };
        }

        if (!apiResponse.data) {
          return { error: 'No prediction data received from API' };
        }

        // Enhance and analyze predictions
        const enhancedPredictions = this.enhancePredictions(apiResponse.data.predictions, totalLots);
        const analysis = this.analyzePredictions(enhancedPredictions);

        // Create response
        const response: PredictionResponse = {
          carpark_number: carparkNumber,
          predictions: enhancedPredictions,
          analysis,
          metadata: {
            generated_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + CACHE_TTL).toISOString(),
            total_lots: totalLots,
          },
        };

        // Successfully fetched predictions
        return { data: response, cached: false };

      } catch (error) {
        console.error('Prediction service error:', error);
        return {
          error: this.getErrorMessage(error),
        };
      }
    });
  }

  /**
   * Fetch predictions from AWS Lambda API
   */
  private static async fetchPredictionsFromAPI(carparkNumber: string): Promise<{ data?: PredictionApiResponse; error?: string }> {
    const request: PredictionRequest = {
      carpark_number: carparkNumber,
      datetime: new Date().toISOString(),
    };

    try {
      const response = await apiClient.post<PredictionApiResponse>(
        API_ENDPOINTS.PREDICTIONS,
        request,
        {
          headers: {
          },
        }
      );

      if (!response.success) {
        return { error: response.error || 'Failed to fetch predictions from API' };
      }

      // Parse API response data

      // Parse JSON string if needed
      let parsedData = response.data;
      if (typeof response.data === 'string') {
        try {
          parsedData = JSON.parse(response.data);
          // Parsed JSON data successfully
        } catch (parseError) {
          console.error('Failed to parse JSON response:', parseError);
          return { error: 'Invalid JSON response from API' };
        }
      }

      // Simple validation - just check if we have the basic structure
      if (!parsedData || !parsedData.carpark_number || !Array.isArray(parsedData.predictions)) {
        console.error('Invalid API response structure:', parsedData);
        return { error: 'Invalid prediction data received from API' };
      }

      return { data: parsedData };

      return { data: response.data };

    } catch (error) {
      console.error('API request failed:', error);
      return { error: this.getErrorMessage(error) };
    }
  }

  /**
   * Enhance raw predictions with additional analysis
   */
  private static enhancePredictions(
    rawPredictions: Array<{ datetime: string; predicted_lots_available: number }>,
    totalLots?: number
  ): EnhancedPrediction[] {
    if (!rawPredictions || rawPredictions.length === 0) {
      return [];
    }

    // Calculate availability percentages and statistics
    const availabilities = rawPredictions.map(p => p.predicted_lots_available);
    const avgAvailability = availabilities.reduce((sum, val) => sum + val, 0) / availabilities.length;

    return rawPredictions.map((prediction) => {
      const availableSlots = Math.max(0, prediction.predicted_lots_available);
      const percentage = totalLots ? Math.min(100, (availableSlots / totalLots) * 100) : 0;

      // Determine status based on availability percentage
      let status: EnhancedPrediction['status'];
      if (percentage >= AVAILABILITY_THRESHOLDS.EXCELLENT) {
        status = 'excellent';
      } else if (percentage >= AVAILABILITY_THRESHOLDS.GOOD) {
        status = 'good';
      } else if (percentage >= AVAILABILITY_THRESHOLDS.LIMITED) {
        status = 'limited';
      } else {
        status = 'very_limited';
      }

      // Determine if this is an optimal time (above average availability)
      const isOptimalTime = availableSlots >= avgAvailability * 1.1; // 10% above average

      // Determine if this is a peak time (below average availability)
      const isPeakTime = availableSlots <= avgAvailability * 0.8; // 20% below average

      // Determine confidence level based on time of day
      const hour = new Date(prediction.datetime).getHours();
      let confidenceLevel: EnhancedPrediction['confidence_level'];

      // Higher confidence during typical business hours
      if (hour >= 8 && hour <= 18) {
        confidenceLevel = 'high';
      } else if (hour >= 6 && hour <= 22) {
        confidenceLevel = 'medium';
      } else {
        confidenceLevel = 'low';
      }

      return {
        datetime: prediction.datetime,
        predicted_lots_available: availableSlots,
        availability_percentage: Math.round(percentage * 10) / 10, // Round to 1 decimal
        status,
        is_optimal_time: isOptimalTime,
        is_peak_time: isPeakTime,
        confidence_level: confidenceLevel,
      };
    });
  }

  /**
   * Analyze predictions to generate insights and recommendations
   */
  private static analyzePredictions(predictions: EnhancedPrediction[]): PredictionAnalysis {
    if (!predictions || predictions.length === 0) {
      return {
        best_times: [],
        worst_times: [],
        insights: ['No prediction data available'],
        overall_trend: 'stable',
      };
    }

    // Find best and worst times
    const sortedByAvailability = [...predictions].sort(
      (a, b) => b.predicted_lots_available - a.predicted_lots_available
    );

    const bestTimes = sortedByAvailability.slice(0, 3).map(p => ({
      time: this.formatTimeForDisplay(p.datetime),
      availability: p.predicted_lots_available,
      reason: 'Good availability expected',
    }));

    const worstTimes = sortedByAvailability.slice(-3).reverse().map(p => ({
      time: this.formatTimeForDisplay(p.datetime),
      availability: p.predicted_lots_available,
      reason: 'Limited availability expected',
    }));

    // Generate simple insights
    const insights = ['Check real-time availability before your visit for best results'];

    return {
      best_times: bestTimes,
      worst_times: worstTimes,
      insights,
      overall_trend: 'stable',
    };
  }

  /**
   * Format datetime for display
   */
  private static formatTimeForDisplay(datetime: string): string {
    const date = new Date(datetime);
    const hour = date.getHours();
    const minute = date.getMinutes();
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
  }

  /**
   * Get user-friendly error message
   */
  private static getErrorMessage(error: unknown): string {
    if (typeof error === 'string') {
      if (error.includes('timeout')) {
        return 'Prediction service is taking longer than expected. Please try again.';
      }
      if (error.includes('network') || error.includes('fetch')) {
        return 'Unable to load predictions. Check your connection and try again.';
      }
      if (error.includes('404')) {
        return 'Predictions not available for this carpark.';
      }
      if (error.includes('500') || error.includes('502') || error.includes('503')) {
        return 'Prediction service temporarily unavailable. Please try again later.';
      }
    }

    return 'Unable to load predictions. Please try again later.';
  }
}

// Export convenience functions for backward compatibility
export const getPredictions = PredictionService.getPredictions.bind(PredictionService);