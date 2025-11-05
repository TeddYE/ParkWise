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
 * Singapore road network zones for intelligent routing
 */
interface SingaporeZone {
  name: string;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  speedFactor: number;
  trafficDensity: number;
  description: string;
}

const SINGAPORE_ZONES: SingaporeZone[] = [
  {
    name: 'CBD Core',
    bounds: { north: 1.295, south: 1.270, east: 103.870, west: 103.830 },
    speedFactor: 0.6,
    trafficDensity: 0.9,
    description: 'Central Business District - heavy traffic, many lights'
  },
  {
    name: 'Marina Bay',
    bounds: { north: 1.290, south: 1.270, east: 103.880, west: 103.850 },
    speedFactor: 0.7,
    trafficDensity: 0.8,
    description: 'Marina Bay area - tourist traffic, wide roads'
  },
  {
    name: 'Orchard Belt',
    bounds: { north: 1.315, south: 1.295, east: 103.845, west: 103.825 },
    speedFactor: 0.65,
    trafficDensity: 0.85,
    description: 'Orchard Road shopping belt - heavy pedestrian and vehicle traffic'
  },
  {
    name: 'Chinatown',
    bounds: { north: 1.290, south: 1.275, east: 103.850, west: 103.840 },
    speedFactor: 0.7,
    trafficDensity: 0.8,
    description: 'Historic district with narrow roads'
  },
  {
    name: 'Little India',
    bounds: { north: 1.315, south: 1.300, east: 103.860, west: 103.845 },
    speedFactor: 0.75,
    trafficDensity: 0.75,
    description: 'Cultural district with moderate traffic'
  },
  {
    name: 'Changi Airport',
    bounds: { north: 1.370, south: 1.340, east: 104.020, west: 103.980 },
    speedFactor: 1.4,
    trafficDensity: 0.3,
    description: 'Airport area with excellent highway access'
  },
  {
    name: 'Jurong Industrial',
    bounds: { north: 1.350, south: 1.310, east: 103.720, west: 103.680 },
    speedFactor: 1.3,
    trafficDensity: 0.4,
    description: 'Industrial area with wide roads, less congestion'
  },
  {
    name: 'Woodlands North',
    bounds: { north: 1.450, south: 1.420, east: 103.800, west: 103.760 },
    speedFactor: 1.2,
    trafficDensity: 0.5,
    description: 'Northern residential area with good road access'
  },
  {
    name: 'Tampines Hub',
    bounds: { north: 1.360, south: 1.340, east: 103.950, west: 103.930 },
    speedFactor: 1.1,
    trafficDensity: 0.6,
    description: 'Eastern residential hub with moderate traffic'
  },
  {
    name: 'Sentosa',
    bounds: { north: 1.260, south: 1.240, east: 103.870, west: 103.820 },
    speedFactor: 0.8,
    trafficDensity: 0.7,
    description: 'Resort island with tourist traffic and speed limits'
  }
];

/**
 * Major Singapore expressways and their characteristics
 */
interface Expressway {
  name: string;
  speedLimit: number;
  avgSpeed: number; // Realistic average considering traffic
  corridors: Array<{
    start: { lat: number; lng: number };
    end: { lat: number; lng: number };
  }>;
}

const SINGAPORE_EXPRESSWAYS: Expressway[] = [
  {
    name: 'PIE (Pan Island Expressway)',
    speedLimit: 90,
    avgSpeed: 65,
    corridors: [
      { start: { lat: 1.340, lng: 103.680 }, end: { lat: 1.340, lng: 103.980 } }
    ]
  },
  {
    name: 'CTE (Central Expressway)',
    speedLimit: 90,
    avgSpeed: 60,
    corridors: [
      { start: { lat: 1.270, lng: 103.840 }, end: { lat: 1.430, lng: 103.840 } }
    ]
  },
  {
    name: 'ECP (East Coast Parkway)',
    speedLimit: 90,
    avgSpeed: 70,
    corridors: [
      { start: { lat: 1.290, lng: 103.860 }, end: { lat: 1.340, lng: 104.000 } }
    ]
  },
  {
    name: 'AYE (Ayer Rajah Expressway)',
    speedLimit: 90,
    avgSpeed: 65,
    corridors: [
      { start: { lat: 1.280, lng: 103.640 }, end: { lat: 1.280, lng: 103.860 } }
    ]
  }
];

/**
 * Determine if a route likely uses expressways based on distance and geography
 */
function getExpresswayUsageProbability(
  origin: { lat: number; lng: number },
  dest: { lat: number; lng: number },
  distance: number
): number {
  // Short distances unlikely to use expressways
  if (distance < 3) return 0;
  if (distance < 5) return 0.2;
  if (distance < 8) return 0.5;
  if (distance < 15) return 0.8;

  // Check if route aligns with major expressway corridors
  let expresswayAlignment = 0;

  for (const expressway of SINGAPORE_EXPRESSWAYS) {
    for (const corridor of expressway.corridors) {
      // Check if origin and destination roughly align with this corridor
      const corridorDirection = {
        lat: corridor.end.lat - corridor.start.lat,
        lng: corridor.end.lng - corridor.start.lng
      };

      const routeDirection = {
        lat: dest.lat - origin.lat,
        lng: dest.lng - origin.lng
      };

      // Calculate alignment (dot product normalized)
      const corridorLength = Math.sqrt(corridorDirection.lat ** 2 + corridorDirection.lng ** 2);
      const routeLength = Math.sqrt(routeDirection.lat ** 2 + routeDirection.lng ** 2);

      if (corridorLength > 0 && routeLength > 0) {
        const alignment = Math.abs(
          (corridorDirection.lat * routeDirection.lat + corridorDirection.lng * routeDirection.lng) /
          (corridorLength * routeLength)
        );
        expresswayAlignment = Math.max(expresswayAlignment, alignment);
      }
    }
  }

  // Base probability for long distances, boosted by expressway alignment
  const baseProbability = 0.9;
  return Math.min(0.95, baseProbability + (expresswayAlignment * 0.3));
}

/**
 * Get the zone characteristics for a coordinate
 */
function getZoneForCoordinate(coord: { lat: number; lng: number }): SingaporeZone | null {
  for (const zone of SINGAPORE_ZONES) {
    if (
      coord.lat >= zone.bounds.south &&
      coord.lat <= zone.bounds.north &&
      coord.lng >= zone.bounds.west &&
      coord.lng <= zone.bounds.east
    ) {
      return zone;
    }
  }
  return null;
}

/**
 * Singapore-optimized driving time calculation
 * Uses detailed knowledge of Singapore's road network, zones, and traffic patterns
 * @param origin - Starting location
 * @param dest - Destination location
 * @returns Driving time result with distance and duration
 */
export function calculateSingaporeDrivingTime(
  origin: { lat: number; lng: number },
  dest: { lat: number; lng: number }
): { distance: number; duration: number } {
  const distance = calculateDistance(origin.lat, origin.lng, dest.lat, dest.lng);

  // Get zone information for origin and destination
  const originZone = getZoneForCoordinate(origin);
  const destZone = getZoneForCoordinate(dest);

  // Base speed calculation based on distance and likely road types
  let baseSpeed = 40; // Default urban speed (increased from 30)

  // Distance-based road type estimation with higher speeds
  if (distance > 15) {
    baseSpeed = 65; // Long distance - likely expressway dominant
  } else if (distance > 8) {
    baseSpeed = 55; // Medium-long distance - mix of arterial and expressway
  } else if (distance > 4) {
    baseSpeed = 48; // Medium distance - arterial roads with some expressway
  } else if (distance > 2) {
    baseSpeed = 42; // Short-medium distance - local arterial roads
  } else {
    baseSpeed = 35; // Very short distance - local roads with some stops
  }

  // Apply zone-based speed adjustments
  let zoneSpeedFactor = 1.0;
  let trafficDensityFactor = 1.0;

  if (originZone && destZone) {
    // Both locations are in known zones
    zoneSpeedFactor = (originZone.speedFactor + destZone.speedFactor) / 2;
    trafficDensityFactor = (originZone.trafficDensity + destZone.trafficDensity) / 2;
  } else if (originZone) {
    // Only origin is in a known zone
    zoneSpeedFactor = (originZone.speedFactor + 1.0) / 2;
    trafficDensityFactor = (originZone.trafficDensity + 0.6) / 2;
  } else if (destZone) {
    // Only destination is in a known zone
    zoneSpeedFactor = (1.0 + destZone.speedFactor) / 2;
    trafficDensityFactor = (0.6 + destZone.trafficDensity) / 2;
  }

  // Expressway usage probability and speed boost
  const expresswayProb = getExpresswayUsageProbability(origin, dest, distance);
  const expresswaySpeedBoost = 1 + (expresswayProb * 0.6); // Up to 60% speed boost for expressway portions

  // Calculate effective speed
  let effectiveSpeed = baseSpeed * zoneSpeedFactor * expresswaySpeedBoost;

  // Traffic density affects overall speed (more traffic = slower average speed)
  effectiveSpeed *= (1 - trafficDensityFactor * 0.3); // Up to 30% reduction for high traffic

  // Time-of-day adjustments (simplified - could be enhanced with actual time)
  const timeOfDayFactor = 1.0; // Neutral - could adjust based on current time
  effectiveSpeed *= timeOfDayFactor;

  // Singapore-specific factors
  const singaporeFactors = {
    // Traffic light density (more in urban areas)
    trafficLights: 1 + (trafficDensityFactor * 0.4), // Up to 40% time increase

    // Parking search time (more in dense areas)
    parkingSearch: distance < 3 ? (1 + trafficDensityFactor * 0.2) : 1.0, // Up to 20% for short trips

    // Road quality and efficiency (Singapore has excellent roads)
    roadQuality: 0.95, // 5% efficiency bonus for good road infrastructure

    // ERP and traffic management efficiency
    trafficManagement: 0.98 // 2% efficiency bonus for smart traffic systems
  };

  // Calculate base travel time
  const baseTime = (distance / effectiveSpeed) * 60; // Convert to minutes

  // Apply Singapore-specific factors
  let adjustedTime = baseTime;
  adjustedTime *= singaporeFactors.trafficLights;
  adjustedTime *= singaporeFactors.parkingSearch;
  adjustedTime *= singaporeFactors.roadQuality;
  adjustedTime *= singaporeFactors.trafficManagement;

  // Minimum realistic driving time (pure driving, no parking/walking)
  let minimumTime = 1; // Base minimum of 1 minute for any driving

  // Distance-based minimums for realistic driving only
  if (distance < 0.5) {
    minimumTime = 2; // Very short trips: 2 minutes
  } else if (distance < 1.0) {
    minimumTime = 2; // Short trips: 2 minutes  
  } else if (distance < 2.0) {
    minimumTime = 3; // Medium-short trips: 3 minutes
  } else {
    minimumTime = Math.max(1, distance * 1.0); // Longer trips: at least 1 min/km
  }

  const finalTime = Math.max(minimumTime, Math.round(adjustedTime));

  return {
    distance: Math.round(distance * 10) / 10,
    duration: finalTime
  };
}

/**
 * Get detailed route information for Singapore
 * @param origin - Starting location
 * @param dest - Destination location
 * @returns Detailed route analysis
 */
export function getSingaporeRouteAnalysis(
  origin: { lat: number; lng: number },
  dest: { lat: number; lng: number }
): {
  distance: number;
  duration: number;
  routeType: string;
  zones: string[];
  expresswayLikely: boolean;
  trafficLevel: 'low' | 'moderate' | 'high';
} {
  const result = calculateSingaporeDrivingTime(origin, dest);
  const distance = result.distance;

  const originZone = getZoneForCoordinate(origin);
  const destZone = getZoneForCoordinate(dest);

  const zones = [
    originZone?.name || 'General Area',
    destZone?.name || 'General Area'
  ].filter((zone, index, arr) => arr.indexOf(zone) === index); // Remove duplicates

  let routeType = 'Local Roads';
  let expresswayLikely = false;

  if (distance > 15) {
    routeType = 'Expressway Dominant';
    expresswayLikely = true;
  } else if (distance > 8) {
    routeType = 'Mixed Arterial/Expressway';
    expresswayLikely = true;
  } else if (distance > 4) {
    routeType = 'Arterial Roads';
  } else {
    routeType = 'Local Roads';
  }

  // Determine traffic level based on zones
  let trafficLevel: 'low' | 'moderate' | 'high' = 'moderate';
  const avgTrafficDensity = zones.reduce((sum, zoneName) => {
    const zone = SINGAPORE_ZONES.find(z => z.name === zoneName);
    return sum + (zone?.trafficDensity || 0.6);
  }, 0) / zones.length;

  if (avgTrafficDensity > 0.8) {
    trafficLevel = 'high';
  } else if (avgTrafficDensity < 0.5) {
    trafficLevel = 'low';
  }

  return {
    distance: result.distance,
    duration: result.duration,
    routeType,
    zones,
    expresswayLikely,
    trafficLevel
  };
}

/**
 * Legacy function for backward compatibility
 * Enhanced to use more realistic Singapore routing
 * @param distanceKm - Distance in kilometers
 * @returns Estimated driving time in minutes
 */
export function estimateDrivingTime(distanceKm: number): number {
  // Use Singapore city center as reference point for more accurate estimates
  const singaporeCenter = { lat: 1.3521, lng: 103.8198 };

  // Create a realistic destination based on distance
  // Use different directions to simulate various Singapore routes
  const directions = [
    { lat: 0.009, lng: 0 },      // North
    { lat: 0, lng: 0.009 },      // East  
    { lat: -0.009, lng: 0 },     // South
    { lat: 0, lng: -0.009 },     // West
    { lat: 0.006, lng: 0.006 },  // Northeast
    { lat: -0.006, lng: 0.006 }, // Southeast
  ];

  // Use the direction that gives the most representative result for the distance
  const directionIndex = Math.floor(distanceKm * 2) % directions.length;
  const direction = directions[directionIndex];

  const destination = {
    lat: singaporeCenter.lat + (direction.lat * distanceKm),
    lng: singaporeCenter.lng + (direction.lng * distanceKm)
  };

  const result = calculateSingaporeDrivingTime(singaporeCenter, destination);
  return result.duration;
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

/**
 * Format driving time for display with Singapore context
 * @param minutes - Driving time in minutes
 * @returns Formatted string (e.g., "8 mins", "1h 15m")
 */
export function formatDrivingTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min${minutes !== 1 ? 's' : ''}`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Get the most efficient carparks based on Singapore routing intelligence
 * @param userLocation - User's current location
 * @param carparks - Array of available carparks
 * @param maxResults - Maximum number of results to return
 * @returns Sorted array of carparks with routing information
 */
export function getOptimalCarparks(
  userLocation: { lat: number; lng: number },
  carparks: Array<{ id: string; lat: number; lng: number;[key: string]: any }>,
  maxResults: number = 10
): Array<{
  carpark: any;
  routeInfo: ReturnType<typeof getSingaporeRouteAnalysis>;
  efficiency: number;
}> {
  const results = carparks.map(carpark => {
    const routeInfo = getSingaporeRouteAnalysis(
      userLocation,
      { lat: carpark.lat, lng: carpark.lng }
    );

    // Calculate efficiency score (lower is better)
    // Factors: time, distance, traffic level, route complexity
    let efficiency = routeInfo.duration;

    // Penalty for high traffic areas
    if (routeInfo.trafficLevel === 'high') {
      efficiency *= 1.2;
    } else if (routeInfo.trafficLevel === 'low') {
      efficiency *= 0.9;
    }

    // Bonus for expressway routes (more predictable)
    if (routeInfo.expresswayLikely) {
      efficiency *= 0.95;
    }

    // Slight penalty for very short distances (parking might be harder to find)
    if (routeInfo.distance < 1) {
      efficiency *= 1.1;
    }

    return {
      carpark,
      routeInfo,
      efficiency
    };
  });

  // Sort by efficiency (best first) and return top results
  return results
    .sort((a, b) => a.efficiency - b.efficiency)
    .slice(0, maxResults);
}

/**
 * Check if a location is within Singapore bounds
 * @param coord - Coordinate to check
 * @returns True if within Singapore
 */
export function isWithinSingapore(coord: { lat: number; lng: number }): boolean {
  // Singapore approximate bounds
  const SINGAPORE_BOUNDS = {
    north: 1.47,
    south: 1.16,
    east: 104.05,
    west: 103.60
  };

  return (
    coord.lat >= SINGAPORE_BOUNDS.south &&
    coord.lat <= SINGAPORE_BOUNDS.north &&
    coord.lng >= SINGAPORE_BOUNDS.west &&
    coord.lng <= SINGAPORE_BOUNDS.east
  );
}

/**
 * Get Singapore region name for a coordinate
 * @param coord - Coordinate to analyze
 * @returns Region name or 'Unknown' if outside Singapore
 */
export function getSingaporeRegion(coord: { lat: number; lng: number }): string {
  if (!isWithinSingapore(coord)) {
    return 'Outside Singapore';
  }

  const zone = getZoneForCoordinate(coord);
  if (zone) {
    return zone.name;
  }

  // Fallback to general regions
  if (coord.lat > 1.4) return 'North Singapore';
  if (coord.lat < 1.28) return 'South Singapore';
  if (coord.lng > 103.9) return 'East Singapore';
  if (coord.lng < 103.75) return 'West Singapore';

  return 'Central Singapore';
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
 * Fetch driving times using OSRM Table service (faster) with Singapore fallback
 * Uses OSRM Table API for batch processing, falls back to local calculation
 * @param origin - Starting location
 * @param destinations - Array of destination carparks
 * @returns Map of carpark IDs to their driving time data
 */
export async function fetchDrivingTimes(
  origin: { lat: number; lng: number },
  destinations: CarparkLocation[]
): Promise<Map<string, DrivingTimeResult>> {
  const results = new Map<string, DrivingTimeResult>();

  // Try OSRM Table service first (much faster for multiple destinations)
  try {
    console.log(`🌐 Trying OSRM Table service for ${destinations.length} destinations`);

    // OSRM Table service can handle up to 25x25 matrix efficiently
    const maxTableSize = 25;

    if (destinations.length <= maxTableSize && destinations.length > 1) {
      // Build coordinates string: origin first, then all destinations
      // Format: lng,lat;lng,lat;lng,lat...
      const coordinates = [
        `${origin.lng},${origin.lat}`, // Source (index 0)
        ...destinations.map(dest => `${dest.lng},${dest.lat}`) // Destinations (index 1+)
      ].join(';');

      // OSRM Table API call
      const url = `https://router.project-osrm.org/table/v1/driving/${coordinates}?sources=0&destinations=${destinations.map((_, i) => i + 1).join(';')}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(url, {
        signal: controller.signal,
        mode: 'cors'
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();

        if (data.code === 'Ok' && data.durations && data.durations[0]) {
          const durations = data.durations[0]; // First row (from origin to all destinations)

          destinations.forEach((dest, index) => {
            const durationSeconds = durations[index];
            if (durationSeconds !== null && durationSeconds !== undefined) {
              const distance = calculateDistance(origin.lat, origin.lng, dest.lat, dest.lng);
              results.set(dest.id, {
                distance,
                duration: Math.round(durationSeconds / 60) // Convert seconds to minutes
              });
            }
          });

          console.log(`✅ OSRM Table service succeeded for ${results.size}/${destinations.length} destinations`);

          // Fill any missing results with local calculation
          destinations.forEach(dest => {
            if (!results.has(dest.id)) {
              const localResult = calculateSingaporeDrivingTime(origin, dest);
              results.set(dest.id, {
                distance: localResult.distance,
                duration: localResult.duration
              });
            }
          });

          return results;
        }
      }
    } else if (destinations.length > maxTableSize) {
      // Handle large sets with batching
      console.log(`📦 Processing ${destinations.length} destinations in batches of ${maxTableSize}`);

      for (let i = 0; i < destinations.length; i += maxTableSize) {
        const batch = destinations.slice(i, i + maxTableSize);

        const coordinates = [
          `${origin.lng},${origin.lat}`,
          ...batch.map(dest => `${dest.lng},${dest.lat}`)
        ].join(';');

        const url = `https://router.project-osrm.org/table/v1/driving/${coordinates}?sources=0&destinations=${batch.map((_, idx) => idx + 1).join(';')}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(url, {
          signal: controller.signal,
          mode: 'cors'
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();

          if (data.code === 'Ok' && data.durations && data.durations[0]) {
            const durations = data.durations[0];

            batch.forEach((dest, index) => {
              const durationSeconds = durations[index];
              if (durationSeconds !== null && durationSeconds !== undefined) {
                const distance = calculateDistance(origin.lat, origin.lng, dest.lat, dest.lng);
                results.set(dest.id, {
                  distance,
                  duration: Math.round(durationSeconds / 60)
                });
              }
            });
          }
        }

        // Small delay between batches to be respectful to the API
        if (i + maxTableSize < destinations.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      console.log(`✅ OSRM Table batching completed for ${results.size}/${destinations.length} destinations`);

      // Fill any missing results with local calculation
      destinations.forEach(dest => {
        if (!results.has(dest.id)) {
          const localResult = calculateSingaporeDrivingTime(origin, dest);
          results.set(dest.id, {
            distance: localResult.distance,
            duration: localResult.duration
          });
        }
      });

      return results;
    }

    throw new Error('OSRM Table service not suitable or failed');

  } catch (error) {
    console.log(`⚠️ OSRM Table service failed, using Singapore-optimized local calculations`);

    // Fallback to Singapore-optimized local calculation
    destinations.forEach(dest => {
      const localResult = calculateSingaporeDrivingTime(origin, dest);
      results.set(dest.id, {
        distance: localResult.distance,
        duration: localResult.duration
      });
    });

    console.log(`✅ Completed Singapore-optimized calculations for ${results.size} destinations`);
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
// const MAX_BATCH_SIZE = 5; // Smaller batches to be gentler on API (not used with local calculation)
// const BATCH_DELAY_MS = 500; // Longer delay between batches (not used with local calculation)

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
 * Fetch driving times with caching using Singapore-optimized local calculation
 * Uses enhanced local calculation for instant, accurate results
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
