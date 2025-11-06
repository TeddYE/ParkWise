import { SearchLocation } from '@/types';

/**
 * OneMap API response interface
 */
interface OneMapResult {
  LATITUDE: string;
  LONGITUDE: string;
  ADDRESS: string;
  POSTAL?: string;
  BUILDING?: string;
  ROAD_NAME?: string;
}

interface OneMapApiResponse {
  found: number;
  totalNumPages: number;
  pageNum: number;
  results: OneMapResult[];
}

/**
 * Geocoding result interface
 */
export interface GeocodingResult {
  latitude: number;
  longitude: number;
  address?: string;
  postalCode: string;
  building?: string;
  roadName?: string;
}

export interface GeocodingResponse {
  result?: GeocodingResult;
  error?: string;
}

/**
 * Geocoding data transformation utilities
 */
export class GeocodingTransformer {
  /**
   * Transform OneMap API response to internal format
   */
  static transformOneMapResponse(apiResponse: OneMapApiResponse): GeocodingResult | null {
    try {
      if (!apiResponse.results || apiResponse.results.length === 0) {
        return null;
      }

      const result = apiResponse.results[0]; // Take the first (best) result

      // Validate coordinates
      const latitude = parseFloat(result.LATITUDE);
      const longitude = parseFloat(result.LONGITUDE);

      if (isNaN(latitude) || isNaN(longitude)) {
        throw new Error('Invalid coordinates in API response');
      }

      // Validate Singapore bounds
      if (!this.isWithinSingapore(latitude, longitude)) {
        throw new Error('Coordinates outside Singapore bounds');
      }

      return {
        latitude,
        longitude,
        address: result.ADDRESS || '',
        postalCode: result.POSTAL || '',
        building: result.BUILDING || undefined,
        roadName: result.ROAD_NAME || undefined,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Transform internal GeocodingResult to SearchLocation
   */
  static toSearchLocation(result: GeocodingResult): SearchLocation {
    return {
      latitude: result.latitude,
      longitude: result.longitude,
      address: result.address,
      postalCode: result.postalCode,
    };
  }

  /**
   * Validate if coordinates are within Singapore bounds
   */
  static isWithinSingapore(latitude: number, longitude: number): boolean {
    // Singapore bounds (approximate)
    const MIN_LAT = 1.15;
    const MAX_LAT = 1.48;
    const MIN_LNG = 103.6;
    const MAX_LNG = 104.05;

    return (
      latitude >= MIN_LAT &&
      latitude <= MAX_LAT &&
      longitude >= MIN_LNG &&
      longitude <= MAX_LNG
    );
  }

  /**
   * Validate and format postal code
   */
  static validatePostalCode(postalCode: string): { isValid: boolean; formatted: string } {
    try {
      // Remove all non-digits
      const digits = postalCode.replace(/\D/g, '');

      // Singapore postal codes are 6 digits
      if (digits.length !== 6) {
        return { isValid: false, formatted: postalCode };
      }

      // Check if it's a valid Singapore postal code range
      const code = parseInt(digits, 10);
      if (code < 10000 || code > 999999) {
        return { isValid: false, formatted: postalCode };
      }

      return { isValid: true, formatted: digits };
    } catch (error) {
      return { isValid: false, formatted: postalCode };
    }
  }

  /**
   * Sanitize search query for API calls
   */
  static sanitizeSearchQuery(query: string): string {
    try {
      // Trim whitespace
      let sanitized = query.trim();

      // Remove potentially harmful characters but keep spaces, commas, hyphens
      sanitized = sanitized.replace(/[<>\"'&]/g, '');

      // Limit length to prevent abuse
      if (sanitized.length > 200) {
        sanitized = sanitized.substring(0, 200);
      }

      return sanitized;
    } catch (error) {
      return '';
    }
  }

  /**
   * Determine if query looks like a postal code
   */
  static isPostalCodeQuery(query: string): boolean {
    const digits = query.replace(/\D/g, '');
    return digits.length === 6;
  }

  /**
   * Generate cache key for geocoding requests
   */
  static generateCacheKey(query: string, type: 'postal' | 'search'): string {
    const sanitized = this.sanitizeSearchQuery(query).toLowerCase();
    return `geocoding-${type}-${sanitized}`;
  }

  /**
   * Validate geocoding result
   */
  static validateResult(result: GeocodingResult): boolean {
    try {
      // Check required fields
      if (typeof result.latitude !== 'number' || typeof result.longitude !== 'number') {
        return false;
      }

      // Check coordinate bounds
      if (!this.isWithinSingapore(result.latitude, result.longitude)) {
        return false;
      }

      // Check for reasonable values
      if (isNaN(result.latitude) || isNaN(result.longitude)) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create error response
   */
  static createErrorResponse(message: string): GeocodingResponse {
    return { error: message };
  }

  /**
   * Create success response
   */
  static createSuccessResponse(result: GeocodingResult): GeocodingResponse {
    return { result };
  }

  /**
   * Get user-friendly error message based on error type
   */
  static getErrorMessage(error: unknown, queryType: 'postal' | 'search'): string {
    if (typeof error === 'string') {
      if (error.includes('network') || error.includes('timeout')) {
        return 'Network error. Please check your connection and try again.';
      }
      if (error.includes('404') || error.includes('not found')) {
        return queryType === 'postal' 
          ? 'Postal code not found. Please check and try again.'
          : 'Location not found. Please try a different search.';
      }
      if (error.includes('rate limit') || error.includes('429')) {
        return 'Too many requests. Please wait a moment and try again.';
      }
    }

    return queryType === 'postal'
      ? 'Failed to find postal code. Please try again.'
      : 'Failed to find location. Please try again.';
  }

  /**
   * Format address for display
   */
  static formatAddress(result: GeocodingResult): string {
    const parts: string[] = [];

    if (result.building) {
      parts.push(result.building);
    }

    if (result.address) {
      parts.push(result.address);
    }

    if (result.postalCode) {
      parts.push(`Singapore ${result.postalCode}`);
    }

    return parts.join(', ') || 'Address not available';
  }
}