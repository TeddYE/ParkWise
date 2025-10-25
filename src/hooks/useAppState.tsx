import { useCallback } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { ViewType, Carpark } from '../types';

/**
 * Enhanced global app state hook with context integration
 * Provides centralized app state management
 */
export function useAppState() {
  const {
    state,
    setCurrentView,
    setSelectedCarpark,
    setSelectedPlan,
    setLoading,
    setError,
  } = useAppContext();

  const handleViewChange = useCallback((view: ViewType) => {
    setCurrentView(view);
    // Clear error when changing views
    if (state.error) {
      setError(null);
    }
  }, [setCurrentView, setError, state.error]);

  const handleSelectCarpark = useCallback((carpark: Carpark | null) => {
    setSelectedCarpark(carpark);
    if (carpark) {
      setCurrentView('details');
    }
  }, [setSelectedCarpark, setCurrentView]);

  const handleBackToMap = useCallback(() => {
    setSelectedCarpark(null);
    setCurrentView('map');
  }, [setSelectedCarpark, setCurrentView]);

  const handlePlanChange = useCallback((plan: "monthly" | "annual") => {
    setSelectedPlan(plan);
  }, [setSelectedPlan]);

  const clearError = useCallback(() => {
    setError(null);
  }, [setError]);

  return {
    // State
    currentView: state.currentView,
    selectedCarpark: state.selectedCarpark,
    selectedPlan: state.selectedPlan,
    loading: state.loading,
    error: state.error,
    
    // Actions
    setCurrentView: handleViewChange,
    setSelectedCarpark: handleSelectCarpark,
    setSelectedPlan: handlePlanChange,
    setLoading,
    setError,
    clearError,
    
    // Convenience methods
    handleViewChange,
    handleSelectCarpark,
    handleBackToMap,
    handlePlanChange,
  };
}