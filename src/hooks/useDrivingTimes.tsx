import { useState, useEffect } from 'react';
import { Carpark } from '../types';
import {
  calculateDistance,
  estimateDrivingTime,
  fetchDrivingTimesWithCache,
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
  const [carparksWithTimes, setCarparksWithTimes] = useState<Carpark[]>(carparks);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userLocation) {
      // No user location, set distance and drivingTime to undefined
      const carparksWithoutLocation = carparks.map(carpark => ({
        ...carpark,
        distance: undefined,
        drivingTime: undefined,
      }));
      setCarparksWithTimes(carparksWithoutLocation);
      return;
    }

    const updateDrivingTimes = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (enableRealTimes) {
          // Try to fetch real driving times from Google Maps
          const destinations = carparks.map(cp => ({
            id: cp.id,
            lat: cp.latitude,
            lng: cp.longitude,
          }));

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

          setCarparksWithTimes(updated);
        } else {
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
    };

    updateDrivingTimes();
  }, [carparks, userLocation, enableRealTimes]);

  return {
    carparks: carparksWithTimes,
    isLoading,
    error,
  };
}
