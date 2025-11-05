/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 - Latitude of first point
 * @param lon1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lon2 - Longitude of second point
 * @returns Distance in kilometers, rounded to 1 decimal place
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}



/**
 * Estimate driving time from distance (fallback when API unavailable)
 * Assumes average city driving speed of 30 km/h
 * @param distanceKm - Distance in kilometers
 * @returns Estimated driving time in minutes (minimum 1 minute)
 */
export function estimateDrivingTime(distanceKm: number): number {
  const avgSpeedKmh = 30; // Average city speed
  const timeInMinutes = (distanceKm / avgSpeedKmh) * 60;
  return Math.max(1, Math.round(timeInMinutes)); // At least 1 minute
}

/**
 * Format distance for display
 * @param distanceKm - Distance in kilometers
 * @returns Formatted string (e.g., "1.5km" or "350m")
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters}m`;
  }
  return `${distanceKm.toFixed(1)}km`;
}

// ===== Google Maps Distance Matrix API Integration =====

interface DrivingTimeResult {
  distance: number; // in km
  duration: number; // in minutes
}

interface CarparkLocation {
  id: string;
  lat: number;
  lng: number;
}

/**
 * Fetch actual driving times using OSRM (Open Source Routing Machine)
 * Free, open-source routing based on OpenStreetMap data
 * @param origin - Starting location
 * @param destinations - Array of destination carparks
 * @returns Map of carpark IDs to their driving time data
 */
export async function fetchDrivingTimes(
  origin: { lat: number; lng: number },
  destinations: CarparkLocation[]
): Promise<Map<string, DrivingTimeResult>> {
  const results = new Map<string, DrivingTimeResult>();

  try {
    // Process destinations in batches for better performance
    const batches = [];
    for (let i = 0; i < destinations.length; i += MAX_BATCH_SIZE) {
      batches.push(destinations.slice(i, i + MAX_BATCH_SIZE));
    }

    let osrmFailureCount = 0;
    const maxOsrmFailures = 3; // Reduce failures before giving up
    let consecutiveTimeouts = 0;
    const maxConsecutiveTimeouts = 2; // Stop OSRM after 2 consecutive timeouts
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      // Process batch in parallel for better performance
      const batchPromises = batch.map(async (dest) => {
        // If we've had too many OSRM failures or consecutive timeouts, just use fallback calculations
        if (osrmFailureCount >= maxOsrmFailures || consecutiveTimeouts >= maxConsecutiveTimeouts) {
          const distance = calculateDistance(origin.lat, origin.lng, dest.lat, dest.lng);
          return {
            id: dest.id,
            result: {
              distance,
              duration: estimateDrivingTime(distance)
            }
          };
        }

        try {
          // OSRM route API: coordinates are in [lng, lat] format (note the order!)
          const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?overview=false`;

          // Add timeout to prevent hanging requests
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000); // Very short timeout

          const response = await fetch(url, { 
            signal: controller.signal,
            mode: 'cors'
          });
          
          clearTimeout(timeoutId);
          consecutiveTimeouts = 0; // Reset timeout counter on success

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();

          if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            return {
              id: dest.id,
              result: {
                distance: Math.round((route.distance / 1000) * 10) / 10,
                duration: Math.round(route.duration / 60)
              }
            };
          } else {
            // API returned but no valid route
            osrmFailureCount++;
            const distance = calculateDistance(origin.lat, origin.lng, dest.lat, dest.lng);
            return {
              id: dest.id,
              result: {
                distance,
                duration: estimateDrivingTime(distance)
              }
            };
          }
        } catch (error) {
          osrmFailureCount++;
          
          // Track consecutive timeouts
          if (error instanceof Error && (error.message.includes('timeout') || error.message.includes('aborted'))) {
            consecutiveTimeouts++;
            if (consecutiveTimeouts === 1) {
              console.warn('OSRM API timing out, switching to fallback calculations for remaining destinations');
            }
          }
          
          if (osrmFailureCount <= 2) { // Only log first few errors
            console.error(`❌ OSRM API error for ${dest.id}:`, error instanceof Error ? error.message : String(error));
          }
          
          // Fallback for this destination
          const distance = calculateDistance(origin.lat, origin.lng, dest.lat, dest.lng);
          return {
            id: dest.id,
            result: {
              distance,
              duration: estimateDrivingTime(distance)
            }
          };
        }
      });

      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises);
      
      // Add results to map
      batchResults.forEach(({ id, result }) => {
        results.set(id, result);
      });

      // Delay between batches to avoid overwhelming the API
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }

    const successCount = results.size;
    const osrmSuccessCount = successCount - osrmFailureCount;
    
    // Only log if there were failures
    if (osrmFailureCount > 0) {
      if (osrmSuccessCount > 0) {
        console.log(`Fetched driving times for ${osrmSuccessCount}/${successCount} destinations using OSRM, ${osrmFailureCount} used fallback`);
      } else {
        console.log(`All ${successCount} destinations used fallback calculations (OSRM unavailable)`);
      }
    }
    
    return results;

  } catch (error) {
    console.error('Critical error in fetchDrivingTimes:', error);
    // Fallback to estimated times for all destinations
    destinations.forEach(dest => {
      if (!results.has(dest.id)) {
        const distance = calculateDistance(origin.lat, origin.lng, dest.lat, dest.lng);
        results.set(dest.id, {
          distance,
          duration: estimateDrivingTime(distance)
        });
      }
    });
    return results;
  }
}

/**
 * Enhanced cache for driving times with persistent storage
 * Key format: "lat,lng" for origin
 */
const drivingTimeCache = new Map<string, {
  data: Map<string, DrivingTimeResult>;
  timestamp: number;
}>();

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours - much longer cache
const MAX_BATCH_SIZE = 5; // Smaller batches to be gentler on API
const BATCH_DELAY_MS = 500; // Longer delay between batches

// Persistent cache using localStorage
const CACHE_STORAGE_KEY = 'parkwise_driving_times_cache';

/**
 * Load cache from localStorage on startup
 */
function loadCacheFromStorage(): void {
  try {
    const stored = localStorage.getItem(CACHE_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      Object.entries(parsed).forEach(([key, value]: [string, any]) => {
        if (value.data && value.timestamp) {
          // Convert plain object back to Map with proper typing
          const dataMap = new Map<string, DrivingTimeResult>();
          Object.entries(value.data).forEach(([k, v]: [string, any]) => {
            if (v && typeof v.distance === 'number' && typeof v.duration === 'number') {
              dataMap.set(k, v as DrivingTimeResult);
            }
          });
          drivingTimeCache.set(key, {
            data: dataMap,
            timestamp: value.timestamp
          });
        }
      });
      console.log('Loaded driving times cache from storage');
    }
  } catch (error) {
    console.warn('Failed to load driving times cache:', error);
  }
}

/**
 * Save cache to localStorage
 */
function saveCacheToStorage(): void {
  try {
    const cacheObject: any = {};
    drivingTimeCache.forEach((value, key) => {
      cacheObject[key] = {
        data: Object.fromEntries(value.data),
        timestamp: value.timestamp
      };
    });
    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(cacheObject));
  } catch (error) {
    console.warn('Failed to save driving times cache:', error);
  }
}

// Load cache on module initialization
loadCacheFromStorage();

function getCacheKey(location: { lat: number; lng: number }): string {
  // Round to 3 decimal places (~111m precision) for better cache hits
  return `${location.lat.toFixed(3)},${location.lng.toFixed(3)}`;
}

/**
 * Preload driving times for common Singapore locations
 */
export async function preloadCommonLocations(destinations: CarparkLocation[]): Promise<void> {
  const commonLocations = [
    { lat: 1.3521, lng: 103.8198 }, // Singapore city center
    { lat: 1.2966, lng: 103.8764 }, // Marina Bay
    { lat: 1.3048, lng: 103.8318 }, // Orchard Road
    { lat: 1.3644, lng: 103.9915 }, // Changi Airport
    { lat: 1.2833, lng: 103.8607 }, // Sentosa
  ];

  // Preload in background without blocking
  setTimeout(async () => {
    for (const location of commonLocations) {
      try {
        await fetchDrivingTimesWithCache(location, destinations); // Preload all carparks
        await new Promise(resolve => setTimeout(resolve, 1000)); // Delay between preloads
      } catch (error) {
        // Ignore preload errors
      }
    }
  }, 5000); // Start preloading after 5 seconds
}

/**
 * Clear old cache entries to prevent storage bloat
 */
export function cleanupCache(): void {
  const now = Date.now();
  let cleanedCount = 0;
  
  drivingTimeCache.forEach((value, key) => {
    if (now - value.timestamp > CACHE_DURATION_MS) {
      drivingTimeCache.delete(key);
      cleanedCount++;
    }
  });
  
  if (cleanedCount > 0) {
    console.log(`Cleaned up ${cleanedCount} expired cache entries`);
    saveCacheToStorage();
  }
}

/**
 * Fetch driving times with caching
 * Only makes API calls if cache is expired or location has changed significantly
 * @param origin - Starting location
 * @param destinations - Array of destination carparks
 * @returns Map of carpark IDs to their driving time data
 */
export async function fetchDrivingTimesWithCache(
  origin: { lat: number; lng: number },
  destinations: CarparkLocation[]
): Promise<Map<string, DrivingTimeResult>> {
  const cacheKey = getCacheKey(origin);
  const cached = drivingTimeCache.get(cacheKey);
  const now = Date.now();

  // Check if cache is valid
  if (cached && (now - cached.timestamp) < CACHE_DURATION_MS) {
    // Check if we have all destinations in cache
    const missingDestinations = destinations.filter(dest => !cached.data.has(dest.id));
    
    if (missingDestinations.length === 0) {
      console.log(`Using cached driving times for ${destinations.length} destinations`);
      return cached.data;
    }
    
    // Fetch only missing destinations
    if (missingDestinations.length < destinations.length) {
      console.log(`Fetching ${missingDestinations.length} missing destinations, ${destinations.length - missingDestinations.length} from cache`);
      const newData = await fetchDrivingTimes(origin, missingDestinations);
      
      // Merge with existing cache
      newData.forEach((value, key) => {
        cached.data.set(key, value);
      });
      
      // Update cache timestamp and save
      cached.timestamp = now;
      drivingTimeCache.set(cacheKey, cached);
      saveCacheToStorage();
      
      return cached.data;
    }
  }

  // Fetch fresh data for all destinations
  console.log(`Fetching fresh driving times for ${destinations.length} destinations`);
  const data = await fetchDrivingTimes(origin, destinations);
  console.log(`Completed fetching driving times, got ${data.size} results`);

  // Update cache and save to storage
  drivingTimeCache.set(cacheKey, {
    data,
    timestamp: now
  });
  saveCacheToStorage();

  return data;
}
