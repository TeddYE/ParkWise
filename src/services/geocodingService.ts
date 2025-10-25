import { apiClient } from '@/api/client';
import { cacheManager } from '@/api/cache';
import {
  GeocodingTransformer,
  GeocodingResult,
  GeocodingResponse
} from './transformers';

/**
 * Refactored Geocoding Service with caching and rate limiting
 */
export class GeocodingService {
  private static readonly CACHE_NAMESPACE = 'geocoding';
  private static readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour
  private static readonly ONEMAP_BASE_URL = 'https://www.onemap.gov.sg/api/common/elastic/search';

  // Rate limiting
  private static lastRequestTime = 0;
  private static readonly MIN_REQUEST_INTERVAL = 100; // 100ms between requests

  /**
   * Geocode postal code with caching and validation
   */
  static async geocodePostalCode(postalCode: string): Promise<GeocodingResponse> {
    try {
      console.log(`Geocoding postal code: ${postalCode}`);

      // Validate and format postal code
      const validation = GeocodingTransformer.validatePostalCode(postalCode);
      if (!validation.isValid) {
        return GeocodingTransformer.createErrorResponse(
          'Invalid postal code format. Please enter a 6-digit Singapore postal code.'
        );
      }

      const formattedPostalCode = validation.formatted;
      const cacheKey = GeocodingTransformer.generateCacheKey(formattedPostalCode, 'postal');

      // Try cache first
      const cached = await cacheManager.get<GeocodingResult>(
        this.CACHE_NAMESPACE,
        cacheKey
      );

      if (cached && GeocodingTransformer.validateResult(cached)) {
        console.log('Using cached postal code result');
        return GeocodingTransformer.createSuccessResponse(cached);
      }

      // Apply rate limiting
      await this.applyRateLimit();

      // Make API request
      const url = `${this.ONEMAP_BASE_URL}?searchVal=${formattedPostalCode}&returnGeom=Y&getAddrDetails=Y&pageNum=1`;

      const response = await apiClient.get<any>(url, {
        timeout: 8000, // 8 seconds
        retries: 2,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.success) {
        const errorMessage = GeocodingTransformer.getErrorMessage(response.error, 'postal');
        return GeocodingTransformer.createErrorResponse(errorMessage);
      }

      // Transform response
      const result = GeocodingTransformer.transformOneMapResponse(response.data);

      if (!result) {
        return GeocodingTransformer.createErrorResponse(
          'Postal code not found. Please check and try again.'
        );
      }

      // Cache successful result
      await cacheManager.set(
        this.CACHE_NAMESPACE,
        cacheKey,
        result,
        { ttl: this.CACHE_TTL }
      );

      console.log('Postal code geocoding successful');
      return GeocodingTransformer.createSuccessResponse(result);

    } catch (error) {
      console.error('Postal code geocoding error:', error);
      const errorMessage = GeocodingTransformer.getErrorMessage(error, 'postal');
      return GeocodingTransformer.createErrorResponse(errorMessage);
    }
  }

  /**
   * Geocode search query with caching and fallback mechanisms
   */
  static async geocodeSearch(searchQuery: string): Promise<GeocodingResponse> {
    try {
      console.log(`Geocoding search query: ${searchQuery}`);

      // Sanitize search query
      const sanitizedQuery = GeocodingTransformer.sanitizeSearchQuery(searchQuery);
      if (!sanitizedQuery) {
        return GeocodingTransformer.createErrorResponse(
          'Invalid search query. Please enter a valid address or location.'
        );
      }

      // Check if it looks like a postal code
      if (GeocodingTransformer.isPostalCodeQuery(sanitizedQuery)) {
        return this.geocodePostalCode(sanitizedQuery);
      }

      const cacheKey = GeocodingTransformer.generateCacheKey(sanitizedQuery, 'search');

      // Try cache first
      const cached = await cacheManager.get<GeocodingResult>(
        this.CACHE_NAMESPACE,
        cacheKey
      );

      if (cached && GeocodingTransformer.validateResult(cached)) {
        console.log('Using cached search result');
        return GeocodingTransformer.createSuccessResponse(cached);
      }

      // Apply rate limiting
      await this.applyRateLimit();

      // Make API request
      const url = `${this.ONEMAP_BASE_URL}?searchVal=${encodeURIComponent(sanitizedQuery)}&returnGeom=Y&getAddrDetails=Y&pageNum=1`;

      const response = await apiClient.get<any>(url, {
        timeout: 8000, // 8 seconds
        retries: 2,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.success) {
        const errorMessage = GeocodingTransformer.getErrorMessage(response.error, 'search');
        return GeocodingTransformer.createErrorResponse(errorMessage);
      }

      // Transform response
      const result = GeocodingTransformer.transformOneMapResponse(response.data);

      if (!result) {
        return GeocodingTransformer.createErrorResponse(
          'Location not found. Please try a different search.'
        );
      }

      // Cache successful result
      await cacheManager.set(
        this.CACHE_NAMESPACE,
        cacheKey,
        result,
        { ttl: this.CACHE_TTL }
      );

      console.log('Search geocoding successful');
      return GeocodingTransformer.createSuccessResponse(result);

    } catch (error) {
      console.error('Search geocoding error:', error);
      const errorMessage = GeocodingTransformer.getErrorMessage(error, 'search');
      return GeocodingTransformer.createErrorResponse(errorMessage);
    }
  }

  /**
   * Batch geocode multiple queries (with rate limiting)
   */
  static async batchGeocode(queries: string[]): Promise<GeocodingResponse[]> {
    const results: GeocodingResponse[] = [];

    for (const query of queries) {
      try {
        const result = await this.geocodeSearch(query);
        results.push(result);

        // Add delay between batch requests
        await new Promise(resolve => setTimeout(resolve, this.MIN_REQUEST_INTERVAL));
      } catch (error) {
        console.error(`Batch geocoding error for query "${query}":`, error);
        results.push(GeocodingTransformer.createErrorResponse(
          'Failed to geocode location. Please try again.'
        ));
      }
    }

    return results;
  }

  /**
   * Reverse geocode coordinates to address
   */
  static async reverseGeocode(latitude: number, longitude: number): Promise<GeocodingResponse> {
    try {
      console.log(`Reverse geocoding coordinates: ${latitude}, ${longitude}`);

      // Validate coordinates
      if (!GeocodingTransformer.isWithinSingapore(latitude, longitude)) {
        return GeocodingTransformer.createErrorResponse(
          'Coordinates are outside Singapore. Please provide valid Singapore coordinates.'
        );
      }

      const cacheKey = `reverse-${latitude.toFixed(6)}-${longitude.toFixed(6)}`;

      // Try cache first
      const cached = await cacheManager.get<GeocodingResult>(
        this.CACHE_NAMESPACE,
        cacheKey
      );

      if (cached) {
        console.log('Using cached reverse geocoding result');
        return GeocodingTransformer.createSuccessResponse(cached);
      }

      // Apply rate limiting
      await this.applyRateLimit();

      // OneMap doesn't have a direct reverse geocoding API, so we'll use a nearby search
      const url = `${this.ONEMAP_BASE_URL}?searchVal=${latitude},${longitude}&returnGeom=Y&getAddrDetails=Y&pageNum=1`;

      const response = await apiClient.get<any>(url, {
        timeout: 8000,
        retries: 2,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.success) {
        return GeocodingTransformer.createErrorResponse(
          'Failed to find address for the given coordinates.'
        );
      }

      const result = GeocodingTransformer.transformOneMapResponse(response.data);

      if (!result) {
        return GeocodingTransformer.createErrorResponse(
          'No address found for the given coordinates.'
        );
      }

      // Cache result
      await cacheManager.set(
        this.CACHE_NAMESPACE,
        cacheKey,
        result,
        { ttl: this.CACHE_TTL }
      );

      return GeocodingTransformer.createSuccessResponse(result);

    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return GeocodingTransformer.createErrorResponse(
        'Failed to find address for the given coordinates.'
      );
    }
  }

  /**
   * Clear geocoding cache
   */
  static async clearCache(): Promise<void> {
    try {
      console.log('Clearing geocoding cache...');
      await cacheManager.invalidate(this.CACHE_NAMESPACE);
      console.log('Geocoding cache cleared successfully');
    } catch (error) {
      console.error('Failed to clear geocoding cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<{ size: number; namespaces: string[] }> {
    return cacheManager.getStats(this.CACHE_NAMESPACE);
  }

  /**
   * Apply rate limiting to prevent API abuse
   */
  private static async applyRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      const delay = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Validate if coordinates are within Singapore bounds
   */
  static isWithinSingapore(latitude: number, longitude: number): boolean {
    return GeocodingTransformer.isWithinSingapore(latitude, longitude);
  }

  /**
   * Format address for display
   */
  static formatAddress(result: GeocodingResult): string {
    return GeocodingTransformer.formatAddress(result);
  }
}

// Export individual functions for backward compatibility
export const geocodePostalCode = GeocodingService.geocodePostalCode.bind(GeocodingService);
export const geocodeSearch = GeocodingService.geocodeSearch.bind(GeocodingService);
export const isWithinSingapore = GeocodingService.isWithinSingapore.bind(GeocodingService);

// Re-export types
export type { GeocodingResult, GeocodingResponse };
