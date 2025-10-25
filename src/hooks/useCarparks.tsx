import { useEffect } from 'react';
import { useCarparkContext } from '../contexts/CarparkContext';

/**
 * Enhanced carpark data hook with context integration
 * Provides carpark data and management methods
 */
export function useCarparks() {
  const {
    state,
    fetchCarparks,
    filterCarparks,
    clearError,
    refreshCarparks,
  } = useCarparkContext();

  // Auto-fetch carparks on mount if not already loaded
  useEffect(() => {
    if (state.carparks.length === 0 && !state.loading && !state.error) {
      fetchCarparks();
    }
  }, [state.carparks.length, state.loading, state.error, fetchCarparks]);

  return {
    // State
    carparks: state.carparks,
    filteredCarparks: state.filteredCarparks,
    loading: state.loading,
    error: state.error,
    lastUpdated: state.lastUpdated,
    
    // Actions
    fetchCarparks,
    filterCarparks,
    clearError,
    refreshCarparks,
    refetch: refreshCarparks, // Alias for backward compatibility
  };
}
