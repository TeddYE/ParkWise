import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { Carpark } from '../types';
import {
  calculateDistance,
  estimateDrivingTime,
  fetchDrivingTimesWithCache,
  preloadCommonLocations,
  cleanupCache,
} from '../utils/distance';

interface UseDrivingTimesProps {
  carparks: Carpark[];
  userLocation: { lat: number; lng: number } | null;
  enableRealTimes?: boolean; // Set to true to use Google Maps API
}

export function useDrivingTimes({
  carparks,
  userLocation,
  enableRealTimes = true,
}: UseDrivingTimesProps) {
  const [carparksWithTimes, setCarparksWithTimes] = useState<Carpark[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasShownFallbackNotice, setHasShownFallbackNotice] = useState(false);

  // Memoize destinations to avoid recalculating on every render
  const destinations = useMemo(() =>
    carparks.map(cp => ({
      id: cp.id,
      lat: cp.latitude,
      lng: cp.longitude,
    })), [carparks]
  );

  // Memoize the update function
  const updateDrivingTimes = useCallback(async () => {
    if (!userLocation) return;

    setIsLoading(true);
    setError(null);

    try {
      if (enableRealTimes) {
        // Try to fetch real driving times from OSRM API
        const drivingTimesMap = await fetchDrivingTimesWithCache(
          userLocation,
          destinations
        );

        // Update carparks with real driving times
        const updated = carparks.map(carpark => {
          const drivingData = drivingTimesMap.get(carpark.id);

          if (drivingData) {
            return {
              ...carpark,
              distance: drivingData.distance,
              drivingTime: drivingData.duration,
            };
          }

          // Fallback to straight-line calculation
          const distance = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            carpark.latitude,
            carpark.longitude
          );

          return {
            ...carpark,
            distance,
            drivingTime: estimateDrivingTime(distance),
          };
        });



        // Sort by driving time (shortest first)
        updated.sort((a, b) => {
          if (a.drivingTime === undefined && b.drivingTime === undefined) return 0;
          if (a.drivingTime === undefined) return 1;
          if (b.drivingTime === undefined) return -1;
          return a.drivingTime - b.drivingTime;
        });


        setCarparksWithTimes([...updated]); // Force new array reference
      } else {
        // Using straight-line distance estimation
        // Use straight-line distance estimation
        const updated = carparks.map(carpark => {
          const distance = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            carpark.latitude,
            carpark.longitude
          );

          return {
            ...carpark,
            distance,
            drivingTime: estimateDrivingTime(distance),
          };
        });



        // Sort by distance
        updated.sort((a, b) => {
          if (a.distance === undefined && b.distance === undefined) return 0;
          if (a.distance === undefined) return 1;
          if (b.distance === undefined) return -1;
          return a.distance - b.distance;
        });

        setCarparksWithTimes(updated);
      }
    } catch (err) {
      console.error('Error updating driving times:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch driving times');

      // Show user-friendly notification only once
      if (!hasShownFallbackNotice) {
        toast.info('Using estimated driving times', {
          description: 'Real-time routing is unavailable. Showing estimated times based on distance.',
          duration: 4000,
        });
        setHasShownFallbackNotice(true);
      }

      // Fallback to estimation
      const updated = carparks.map(carpark => {
        const distance = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          carpark.latitude,
          carpark.longitude
        );

        return {
          ...carpark,
          distance,
          drivingTime: estimateDrivingTime(distance),
        };
      });

      updated.sort((a, b) => a.distance - b.distance);
      setCarparksWithTimes(updated);
    } finally {
      setIsLoading(false);
    }
  }, [carparks, userLocation, enableRealTimes, hasShownFallbackNotice]);

  // Initialize carparks and start preloading
  useEffect(() => {
    if (carparks.length > 0 && carparksWithTimes.length === 0) {
      setCarparksWithTimes([...carparks]);
      
      // Start preloading common locations in background
      const destinations = carparks.map(cp => ({
        id: cp.id,
        lat: cp.latitude,
        lng: cp.longitude,
      }));
      preloadCommonLocations(destinations);
      
      // Cleanup old cache entries
      cleanupCache();
    }
  }, [carparks, carparksWithTimes.length]);

  useEffect(() => {
    if (!userLocation) {
      // No user location, setting undefined driving times
      // No user location, set distance and drivingTime to undefined
      const carparksWithoutLocation = carparks.map(carpark => ({
        ...carpark,
        distance: undefined,
        drivingTime: undefined,
      }));
      setCarparksWithTimes([...carparksWithoutLocation]);
      return;
    }

    if (carparks.length === 0) {
      // No carparks data, skipping driving times calculation
      return;
    }

    // Both location and carparks available, updating driving times
    updateDrivingTimes();
  }, [carparks, userLocation, updateDrivingTimes]);

  return {
    carparks: carparksWithTimes,
    isLoading,
    error,
  };
}
