import { useState, useCallback, useMemo } from 'react';
import { SearchFilters, SearchState, SearchLocation, Carpark } from '../types';
import { useCarparkContext } from '../contexts/CarparkContext';
import { useLocalStorage } from './useLocalStorage';

const defaultFilters: SearchFilters = {
  maxDistance: 5, // km
  maxPrice: 50, // SGD per hour
  requireEV: false,
  carparkTypes: [],
  minAvailability: 0, // percentage
  sortBy: 'distance',
};

/**
 * Enhanced search filters hook for search state management
 * Provides search state and filtering logic with persistence
 */
export function useSearchFilters() {
  const { state: carparkState, filterCarparks } = useCarparkContext();
  const [savedFilters, setSavedFilters] = useLocalStorage<SearchFilters>('searchFilters', defaultFilters);
  
  const [searchState, setSearchState] = useState<SearchState>({
    query: '',
    filters: savedFilters,
    location: null,
    results: [],
    loading: false,
  });

  const updateQuery = useCallback((query: string) => {
    setSearchState(prev => ({ ...prev, query }));
  }, []);

  const updateLocation = useCallback((location: SearchLocation | null) => {
    setSearchState(prev => ({ ...prev, location }));
  }, []);

  const updateFilters = useCallback((newFilters: Partial<SearchFilters>) => {
    const updatedFilters = { ...searchState.filters, ...newFilters };
    setSearchState(prev => ({ ...prev, filters: updatedFilters }));
    setSavedFilters(updatedFilters);
    
    // Apply filters to carparks
    filterCarparks(updatedFilters);
  }, [searchState.filters, setSavedFilters, filterCarparks]);

  const resetFilters = useCallback(() => {
    setSearchState(prev => ({ ...prev, filters: defaultFilters }));
    setSavedFilters(defaultFilters);
    filterCarparks(defaultFilters);
  }, [setSavedFilters, filterCarparks]);

  const setLoading = useCallback((loading: boolean) => {
    setSearchState(prev => ({ ...prev, loading }));
  }, []);

  // Calculate distance for carparks based on search location
  const calculateDistances = useCallback((carparks: Carpark[], location: SearchLocation): Carpark[] => {
    return carparks.map(carpark => {
      const distance = calculateHaversineDistance(
        location.latitude,
        location.longitude,
        carpark.latitude,
        carpark.longitude
      );
      return { ...carpark, distance };
    });
  }, []);

  // Filter carparks by search query
  const filterByQuery = useCallback((carparks: Carpark[], query: string): Carpark[] => {
    if (!query.trim()) return carparks;

    const searchTerm = query.toLowerCase().trim();
    return carparks.filter(carpark => 
      carpark.name.toLowerCase().includes(searchTerm) ||
      carpark.address.toLowerCase().includes(searchTerm) ||
      carpark.type.toLowerCase().includes(searchTerm)
    );
  }, []);

  // Get filtered and sorted results
  const filteredResults = useMemo(() => {
    let results = carparkState.filteredCarparks;

    // Apply text search
    if (searchState.query) {
      results = filterByQuery(results, searchState.query);
    }

    // Calculate distances if location is available
    if (searchState.location) {
      results = calculateDistances(results, searchState.location);
    }

    return results;
  }, [
    carparkState.filteredCarparks,
    searchState.query,
    searchState.location,
    filterByQuery,
    calculateDistances,
  ]);

  // Available carpark types for filtering
  const availableCarparkTypes = useMemo(() => {
    const types = new Set(carparkState.carparks.map(carpark => carpark.type));
    return Array.from(types).sort();
  }, [carparkState.carparks]);

  return {
    // State
    query: searchState.query,
    filters: searchState.filters,
    location: searchState.location,
    results: filteredResults,
    loading: searchState.loading || carparkState.loading,
    error: carparkState.error,
    
    // Available options
    availableCarparkTypes,
    
    // Actions
    updateQuery,
    updateLocation,
    updateFilters,
    resetFilters,
    setLoading,
    
    // Filter helpers
    setMaxDistance: (distance: number) => updateFilters({ maxDistance: distance }),
    setMaxPrice: (price: number) => updateFilters({ maxPrice: price }),
    setRequireEV: (requireEV: boolean) => updateFilters({ requireEV }),
    setCarparkTypes: (types: string[]) => updateFilters({ carparkTypes: types }),
    setMinAvailability: (availability: number) => updateFilters({ minAvailability: availability }),
    setSortBy: (sortBy: SearchFilters['sortBy']) => updateFilters({ sortBy }),
  };
}

// Helper function to calculate distance between two coordinates
function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}