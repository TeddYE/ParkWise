import { useCallback } from 'react';
import { useMapContext } from '../contexts/MapContext';
import { SearchLocation, MapBounds } from '../types';

/**
 * Enhanced map state hook for map interactions and bounds management
 * Provides map state and methods with optimized performance
 */
export function useMapState() {
  const {
    state,
    setUserLocation,
    setMapBounds,
    setSelectedCarparkId,
    setZoom,
    setCenter,
    updateMapView,
  } = useMapContext();

  const getCurrentLocation = useCallback((): Promise<SearchLocation> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: SearchLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setUserLocation(location);
          resolve(location);
        },
        (error) => {
          console.error('Geolocation error:', error);
          reject(new Error('Failed to get current location'));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        }
      );
    });
  }, [setUserLocation]);

  const centerMapOnLocation = useCallback((location: SearchLocation, zoom?: number) => {
    const mapZoom = zoom || state.zoom;
    updateMapView(location, mapZoom);
  }, [state.zoom, updateMapView]);

  const centerMapOnUser = useCallback(async () => {
    try {
      const location = await getCurrentLocation();
      centerMapOnLocation(location, 15);
      return location;
    } catch (error) {
      console.error('Failed to center map on user:', error);
      throw error;
    }
  }, [getCurrentLocation, centerMapOnLocation]);

  const selectCarpark = useCallback((carparkId: string | null) => {
    setSelectedCarparkId(carparkId);
  }, [setSelectedCarparkId]);

  const updateBounds = useCallback((bounds: MapBounds) => {
    setMapBounds(bounds);
  }, [setMapBounds]);

  const zoomToFit = useCallback((locations: SearchLocation[]) => {
    if (locations.length === 0) return;

    if (locations.length === 1) {
      centerMapOnLocation(locations[0], 15);
      return;
    }

    // Calculate bounds for multiple locations
    const lats = locations.map(loc => loc.latitude);
    const lngs = locations.map(loc => loc.longitude);
    
    const bounds: MapBounds = {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lngs),
      west: Math.min(...lngs),
    };

    // Add padding to bounds
    const latPadding = (bounds.north - bounds.south) * 0.1;
    const lngPadding = (bounds.east - bounds.west) * 0.1;

    const paddedBounds: MapBounds = {
      north: bounds.north + latPadding,
      south: bounds.south - latPadding,
      east: bounds.east + lngPadding,
      west: bounds.west - lngPadding,
    };

    setMapBounds(paddedBounds);
  }, [centerMapOnLocation, setMapBounds]);

  return {
    // State
    userLocation: state.userLocation,
    mapBounds: state.mapBounds,
    selectedCarparkId: state.selectedCarparkId,
    zoom: state.zoom,
    center: state.center,
    
    // Actions
    setUserLocation,
    setMapBounds: updateBounds,
    setSelectedCarparkId: selectCarpark,
    setZoom,
    setCenter,
    updateMapView,
    
    // Convenience methods
    getCurrentLocation,
    centerMapOnLocation,
    centerMapOnUser,
    zoomToFit,
  };
}