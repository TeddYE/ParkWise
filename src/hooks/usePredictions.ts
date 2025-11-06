import { useState, useCallback, useRef, useEffect } from 'react';
import { PredictionService, PredictionServiceResponse, PredictionResponse } from '../services/predictionService';

/**
 * Custom hook for prediction management
 * Provides prediction state management with loading states, error handling, and retry functionality
 * Integrates with caching service and implements request deduplication
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface PredictionState {
  data: PredictionResponse | null;
  loading: boolean;
  error: string | null;
  cached: boolean;
  lastUpdated: Date | null;
}

export interface PredictionHookOptions {
  autoFetch?: boolean; // Automatically fetch predictions when carpark changes
  retryAttempts?: number; // Number of retry attempts on failure
  retryDelay?: number; // Delay between retry attempts in milliseconds
  staleThreshold?: number; // Minutes after which to consider cache stale
}

export interface PredictionHookReturn {
  // State
  data: PredictionResponse | null;
  loading: boolean;
  error: string | null;
  cached: boolean;
  lastUpdated: Date | null;
  
  // Actions
  fetchPredictions: (carparkNumber: string, totalLots?: number) => Promise<void>;
  retry: () => Promise<void>;
  clearError: () => void;
  clearData: () => void;
  refreshPredictions: (carparkNumber: string, totalLots?: number) => Promise<void>;
  
  // Utility
  isStale: boolean;
  canRetry: boolean;
}

// ============================================================================
// Default Options
// ============================================================================

const DEFAULT_OPTIONS: Required<PredictionHookOptions> = {
  autoFetch: false,
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
  staleThreshold: 15, // 15 minutes
};

// ============================================================================
// Custom Hook Implementation
// ============================================================================

export function usePredictions(options: PredictionHookOptions = {}): PredictionHookReturn {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // State management
  const [state, setState] = useState<PredictionState>({
    data: null,
    loading: false,
    error: null,
    cached: false,
    lastUpdated: null,
  });

  // Refs for tracking retry attempts and current request
  const retryCountRef = useRef(0);
  const lastRequestRef = useRef<{ carparkNumber: string; totalLots?: number } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup function to abort ongoing requests
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Helper function to update state
  const updateState = useCallback((updates: Partial<PredictionState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Clear error state
  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  // Clear all data
  const clearData = useCallback(() => {
    cleanup();
    setState({
      data: null,
      loading: false,
      error: null,
      cached: false,
      lastUpdated: null,
    });
    retryCountRef.current = 0;
    lastRequestRef.current = null;
  }, [cleanup]);

  // Core fetch function with error handling and retry logic
  const fetchPredictions = useCallback(async (
    carparkNumber: string, 
    totalLots?: number
  ): Promise<void> => {
    // Validate input
    if (!carparkNumber || typeof carparkNumber !== 'string') {
      updateState({ 
        error: 'Invalid carpark number provided',
        loading: false 
      });
      return;
    }

    // Cancel any ongoing request
    cleanup();

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    // Store request parameters for retry
    lastRequestRef.current = { carparkNumber, totalLots };

    // Reset retry count for new request
    retryCountRef.current = 0;

    // Set loading state
    updateState({ 
      loading: true, 
      error: null 
    });

    try {
      console.log(`Fetching predictions for carpark ${carparkNumber}...`);

      // Call prediction service (which handles caching and deduplication internally)
      const response: PredictionServiceResponse = await PredictionService.getPredictions(
        carparkNumber, 
        totalLots
      );

      // Check if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        console.log('Prediction request was aborted');
        return;
      }

      if (response.error) {
        // Handle service error
        updateState({
          loading: false,
          error: response.error,
          cached: false,
        });
        return;
      }

      if (response.data) {
        // Success - update state with prediction data
        updateState({
          data: response.data,
          loading: false,
          error: null,
          cached: response.cached || false,
          lastUpdated: new Date(),
        });

        console.log(`Successfully loaded predictions for carpark ${carparkNumber}`, {
          cached: response.cached,
          predictionsCount: response.data.predictions.length,
        });
      } else {
        // No data received
        updateState({
          loading: false,
          error: 'No prediction data received',
          cached: false,
        });
      }

    } catch (error) {
      // Check if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        console.log('Prediction request was aborted');
        return;
      }

      console.error('Prediction fetch error:', error);
      
      // Handle different error types
      let errorMessage = 'Failed to load predictions';
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return; // Request was cancelled, don't update state
        }
        
        if (error.message.includes('timeout')) {
          errorMessage = 'Request timed out. Please try again.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection.';
        } else {
          errorMessage = error.message;
        }
      }

      updateState({
        loading: false,
        error: errorMessage,
        cached: false,
      });

    } finally {
      // Clean up abort controller
      abortControllerRef.current = null;
    }
  }, [cleanup, updateState]);

  // Retry function with exponential backoff
  const retry = useCallback(async (): Promise<void> => {
    if (!lastRequestRef.current) {
      updateState({ error: 'No previous request to retry' });
      return;
    }

    if (retryCountRef.current >= opts.retryAttempts) {
      updateState({ error: 'Maximum retry attempts reached' });
      return;
    }

    // Increment retry count
    retryCountRef.current += 1;

    // Calculate delay with exponential backoff
    const delay = opts.retryDelay * Math.pow(2, retryCountRef.current - 1);
    
    console.log(`Retrying prediction request (attempt ${retryCountRef.current}/${opts.retryAttempts}) after ${delay}ms...`);

    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, delay));

    // Retry the request
    const { carparkNumber, totalLots } = lastRequestRef.current;
    await fetchPredictions(carparkNumber, totalLots);
  }, [fetchPredictions, opts.retryAttempts, opts.retryDelay, updateState]);

  // Refresh predictions (force fetch, bypassing cache)
  const refreshPredictions = useCallback(async (
    carparkNumber: string, 
    totalLots?: number
  ): Promise<void> => {
    try {
      // Clear cache for this carpark first
      await PredictionService.clearCache(carparkNumber);
      
      // Then fetch fresh data
      await fetchPredictions(carparkNumber, totalLots);
    } catch (error) {
      console.error('Refresh predictions error:', error);
      updateState({ 
        error: 'Failed to refresh predictions',
        loading: false 
      });
    }
  }, [fetchPredictions, updateState]);

  // Check if data is stale
  const isStale = state.lastUpdated 
    ? (Date.now() - state.lastUpdated.getTime()) > (opts.staleThreshold * 60 * 1000)
    : false;

  // Check if retry is possible
  const canRetry = !state.loading && 
                   state.error !== null && 
                   lastRequestRef.current !== null && 
                   retryCountRef.current < opts.retryAttempts;

  return {
    // State
    data: state.data,
    loading: state.loading,
    error: state.error,
    cached: state.cached,
    lastUpdated: state.lastUpdated,
    
    // Actions
    fetchPredictions,
    retry,
    clearError,
    clearData,
    refreshPredictions,
    
    // Utility
    isStale,
    canRetry,
  };
}

// ============================================================================
// Specialized Hook Variants
// ============================================================================

/**
 * Hook for auto-fetching predictions when carpark changes
 */
export function usePredictionsAutoFetch(
  carparkNumber: string | null,
  totalLots?: number,
  options: PredictionHookOptions = {}
): PredictionHookReturn {
  const predictions = usePredictions({ ...options, autoFetch: true });

  // Auto-fetch when carpark number changes
  useEffect(() => {
    if (carparkNumber && carparkNumber.trim()) {
      predictions.fetchPredictions(carparkNumber, totalLots);
    } else {
      predictions.clearData();
    }
  }, [carparkNumber, totalLots, predictions]);

  return predictions;
}

/**
 * Hook for predictions with background refresh
 */
export function usePredictionsWithRefresh(
  carparkNumber: string | null,
  totalLots?: number,
  refreshIntervalMinutes: number = 10,
  options: PredictionHookOptions = {}
): PredictionHookReturn {
  const predictions = usePredictions(options);

  // Set up background refresh
  useEffect(() => {
    if (!carparkNumber || !carparkNumber.trim()) {
      return;
    }

    // Initial fetch
    predictions.fetchPredictions(carparkNumber, totalLots);

    // Set up refresh interval
    const interval = setInterval(() => {
      if (!predictions.loading) {
        console.log(`Background refresh for carpark ${carparkNumber}`);
        predictions.refreshPredictions(carparkNumber, totalLots);
      }
    }, refreshIntervalMinutes * 60 * 1000);

    return () => {
      clearInterval(interval);
    };
  }, [carparkNumber, totalLots, refreshIntervalMinutes, predictions]);

  return predictions;
}

// ============================================================================
// Export Default Hook
// ============================================================================

export default usePredictions;