import { Carpark, CarparkInfoApiResponse, CarparkAvailabilityApiResponse } from '@/types';
import { apiClient } from '@/api/client';
import { cacheManager } from '@/api/cache';
import { API_ENDPOINTS } from '@/api/endpoints';
import { CarparkTransformer } from './transformers';

/**
 * Refactored Carpark Service using centralized API client and caching
 */
export class CarparkService {
  // Cache configuration
  private static readonly CACHE_NAMESPACE = 'carpark';
  private static readonly INFO_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly AVAILABILITY_CACHE_TTL = 60 * 1000; // 1 minute

  /**
   * Fetch all carpark data with intelligent caching
   */
  static async fetchCarparks(): Promise<Carpark[]> {
    try {
      console.log('Fetching carpark data with centralized API client...');
      
      const [infoData, availabilityData] = await Promise.all([
        this.getCarparkInfo(),
        this.getAvailabilityData(),
      ]);

      const carparks = CarparkTransformer.combineCarparksData(infoData, availabilityData);
      
      console.log(`Successfully processed ${carparks.length} carparks`);
      return carparks;
    } catch (error) {
      console.error('Failed to fetch carpark data:', error);
      
      // Try to return cached data as fallback
      const cachedCarparks = await this.getCachedCarparks();
      if (cachedCarparks.length > 0) {
        console.log(`Returning ${cachedCarparks.length} cached carparks as fallback`);
        return cachedCarparks;
      }
      
      return [];
    }
  }

  /**
   * Get carpark information with caching
   */
  private static async getCarparkInfo(): Promise<CarparkInfoApiResponse[]> {
    const cacheKey = 'carpark-info';
    
    // Try to get from cache first
    const cached = await cacheManager.get<CarparkInfoApiResponse[]>(
      this.CACHE_NAMESPACE,
      cacheKey
    );
    
    if (cached) {
      console.log('Using cached carpark info data');
      return cached;
    }

    console.log('Fetching fresh carpark info data...');
    
    try {
      // Use original empty headers configuration like the original service
      const response = await apiClient.get<any>(API_ENDPOINTS.CARPARK_INFO, {
        timeout: 15000,
        retries: 2,
        headers: {}, // Empty headers like original implementation
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch carpark info');
      }

      // Parse the response data structure
      const rawData = response.data;
      const data = typeof rawData.body === 'string' ? JSON.parse(rawData.body) : rawData.body;
      const records: CarparkInfoApiResponse[] = data.carpark_info_list || [];

      // Cache the successful response
      await cacheManager.set(
        this.CACHE_NAMESPACE,
        cacheKey,
        records,
        { ttl: this.INFO_CACHE_TTL }
      );

      console.log(`Cached ${records.length} carpark info records`);
      
      // Log sample for debugging
      if (records.length > 0) {
        console.log('Sample carpark info record:', {
          carpark_number: records[0].carpark_number,
          total_lots: records[0].total_lots,
          current_rate_30min: records[0].current_rate_30min,
          active_cap_amount: records[0].active_cap_amount,
        });
      }

      return records;
    } catch (error) {
      console.error('Failed to fetch carpark info:', error);
      
      // Try to get expired cache as fallback
      const expiredCache = await cacheManager.get<CarparkInfoApiResponse[]>(
        this.CACHE_NAMESPACE,
        `${cacheKey}-expired`
      );
      
      if (expiredCache) {
        console.log('Using expired cached carpark info data as fallback');
        return expiredCache;
      }
      
      throw error;
    }
  }

  /**
   * Get availability data with caching
   */
  private static async getAvailabilityData(): Promise<CarparkAvailabilityApiResponse[]> {
    const cacheKey = 'carpark-availability';
    
    // Try to get from cache first
    const cached = await cacheManager.get<CarparkAvailabilityApiResponse[]>(
      this.CACHE_NAMESPACE,
      cacheKey
    );
    
    if (cached) {
      console.log('Using cached availability data');
      return cached;
    }

    console.log('Fetching fresh availability data...');
    
    try {
      // Use original empty headers configuration like the original service
      const response = await apiClient.get<any>(API_ENDPOINTS.CARPARK_AVAILABILITY, {
        timeout: 10000,
        retries: 3,
        headers: {}, // Empty headers like original implementation
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch availability data');
      }

      // Parse the response data structure
      const rawData = response.data;
      const data = typeof rawData.body === 'string' ? JSON.parse(rawData.body) : rawData.body;
      const records: CarparkAvailabilityApiResponse[] = data.carpark_ava || [];

      // Cache the successful response
      await cacheManager.set(
        this.CACHE_NAMESPACE,
        cacheKey,
        records,
        { ttl: this.AVAILABILITY_CACHE_TTL }
      );

      console.log(`Cached ${records.length} availability records`);
      return records;
    } catch (error) {
      console.error('Failed to fetch availability data:', error);
      
      // Try to get expired cache as fallback
      const expiredCache = await cacheManager.get<CarparkAvailabilityApiResponse[]>(
        this.CACHE_NAMESPACE,
        `${cacheKey}-expired`
      );
      
      if (expiredCache) {
        console.log('Using expired cached availability data as fallback');
        return expiredCache;
      }
      
      throw error;
    }
  }

  /**
   * Get cached carpark data as fallback
   */
  private static async getCachedCarparks(): Promise<Carpark[]> {
    try {
      const cached = await cacheManager.get<Carpark[]>(
        this.CACHE_NAMESPACE,
        'processed-carparks'
      );
      return cached || [];
    } catch (error) {
      console.error('Failed to get cached carparks:', error);
      return [];
    }
  }

  /**
   * Cache processed carpark data for fallback
   */
  private static async cacheProcessedCarparks(carparks: Carpark[]): Promise<void> {
    try {
      await cacheManager.set(
        this.CACHE_NAMESPACE,
        'processed-carparks',
        carparks,
        { ttl: this.INFO_CACHE_TTL }
      );
    } catch (error) {
      console.error('Failed to cache processed carparks:', error);
    }
  }

  /**
   * Clear all carpark-related cache
   */
  static async clearCache(): Promise<void> {
    try {
      console.log('Clearing carpark data cache...');
      await cacheManager.invalidate(this.CACHE_NAMESPACE);
      console.log('Carpark cache cleared successfully');
    } catch (error) {
      console.error('Failed to clear carpark cache:', error);
    }
  }

  /**
   * Refresh carpark data (force fetch and update cache)
   */
  static async refreshData(): Promise<Carpark[]> {
    try {
      console.log('Refreshing carpark data...');
      
      // Clear cache first
      await this.clearCache();
      
      // Fetch fresh data
      const carparks = await this.fetchCarparks();
      
      // Cache the processed data for fallback
      await this.cacheProcessedCarparks(carparks);
      
      return carparks;
    } catch (error) {
      console.error('Failed to refresh carpark data:', error);
      throw error;
    }
  }

  /**
   * Get carpark by ID with caching
   */
  static async getCarparkById(carparkId: string): Promise<Carpark | null> {
    try {
      const cacheKey = `carpark-${carparkId}`;
      
      // Try cache first
      const cached = await cacheManager.get<Carpark>(this.CACHE_NAMESPACE, cacheKey);
      if (cached) {
        return cached;
      }

      // If not in cache, fetch all and find the specific one
      const carparks = await this.fetchCarparks();
      const carpark = carparks.find(cp => cp.id === carparkId) || null;
      
      // Cache individual carpark if found
      if (carpark) {
        await cacheManager.set(
          this.CACHE_NAMESPACE,
          cacheKey,
          carpark,
          { ttl: this.INFO_CACHE_TTL }
        );
      }
      
      return carpark;
    } catch (error) {
      console.error(`Failed to get carpark ${carparkId}:`, error);
      return null;
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  static async getCacheStats(): Promise<{ size: number; namespaces: string[] }> {
    return cacheManager.getStats(this.CACHE_NAMESPACE);
  }
}