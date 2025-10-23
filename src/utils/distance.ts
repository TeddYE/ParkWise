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
    // Check if we should use Google Maps API instead
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    const useGoogleMaps = apiKey && import.meta.env.VITE_USE_GOOGLE_MAPS === 'true';
    
    if (useGoogleMaps) {
      // If you have a backend proxy for Google Maps, use it here
      console.log('Google Maps API not directly supported in browser due to CORS');
      console.log('Using OSRM instead for client-side routing');
    }

    // Use OSRM for client-side routing
    // Process destinations one by one (OSRM's public server is more reliable this way)
    for (const dest of destinations) {
      try {
        // OSRM route API: coordinates are in [lng, lat] format (note the order!)
        const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?overview=false`;

        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          results.set(dest.id, {
            distance: Math.round((route.distance / 1000) * 10) / 10, // Convert meters to km
            duration: Math.round(route.duration / 60) // Convert seconds to minutes
          });
        } else {
          // Fallback for this destination
          const distance = calculateDistance(origin.lat, origin.lng, dest.lat, dest.lng);
          results.set(dest.id, {
            distance,
            duration: estimateDrivingTime(distance)
          });
        }

        // Small delay to avoid overwhelming the public OSRM server
        if (destinations.length > 5) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.warn(`Failed to fetch route for destination ${dest.id}:`, error);
        // Fallback for this destination
        const distance = calculateDistance(origin.lat, origin.lng, dest.lat, dest.lng);
        results.set(dest.id, {
          distance,
          duration: estimateDrivingTime(distance)
        });
      }
    }

    console.log(`Fetched driving times for ${results.size} destinations using OSRM`);
    return results;
    
  } catch (error) {
    console.error('Error fetching driving times:', error);
    // Fallback to estimated times for all destinations
    destinations.forEach(dest => {
      const distance = calculateDistance(origin.lat, origin.lng, dest.lat, dest.lng);
      results.set(dest.id, {
        distance,
        duration: estimateDrivingTime(distance)
      });
    });
    return results;
  }
}

/**
 * Cache for driving times to avoid excessive API calls
 * Key format: "lat,lng" for origin
 */
const drivingTimeCache = new Map<string, {
  data: Map<string, DrivingTimeResult>;
  timestamp: number;
}>();

const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

function getCacheKey(location: { lat: number; lng: number }): string {
  // Round to 4 decimal places (~11m precision) for cache key
  return `${location.lat.toFixed(4)},${location.lng.toFixed(4)}`;
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
    console.log('Using cached driving times');
    return cached.data;
  }
  
  // Fetch fresh data
  const data = await fetchDrivingTimes(origin, destinations);
  
  // Update cache
  drivingTimeCache.set(cacheKey, {
    data,
    timestamp: now
  });
  
  return data;
}
