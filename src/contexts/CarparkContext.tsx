import { createContext, useContext, useReducer, useCallback, ReactNode, useMemo } from 'react';
import { Carpark, CarparkState, SearchFilters } from '../types';
import { CarparkService } from '../services/carparkService';

interface CarparkContextType {
  state: CarparkState;
  fetchCarparks: () => Promise<void>;
  filterCarparks: (filters: SearchFilters) => void;
  clearError: () => void;
  refreshCarparks: () => Promise<void>;
}

const CarparkContext = createContext<CarparkContextType | undefined>(undefined);

type CarparkAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_CARPARKS'; payload: Carpark[] }
  | { type: 'SET_FILTERED_CARPARKS'; payload: Carpark[] }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_LAST_UPDATED'; payload: Date | null }
  | { type: 'CLEAR_ERROR' };

const initialState: CarparkState = {
  carparks: [],
  filteredCarparks: [],
  loading: false,
  error: null,
  lastUpdated: null,
};

function carparkReducer(state: CarparkState, action: CarparkAction): CarparkState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_CARPARKS':
      return {
        ...state,
        carparks: action.payload,
        filteredCarparks: action.payload,
        lastUpdated: new Date(),
      };
    case 'SET_FILTERED_CARPARKS':
      return { ...state, filteredCarparks: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_LAST_UPDATED':
      return { ...state, lastUpdated: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

interface CarparkProviderProps {
  children: ReactNode;
}

export function CarparkProvider({ children }: CarparkProviderProps) {
  const [state, dispatch] = useReducer(carparkReducer, initialState);

  const fetchCarparks = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });
      
      const data = await CarparkService.fetchCarparks();
      dispatch({ type: 'SET_CARPARKS', payload: data });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch carparks';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const filterCarparks = useCallback((filters: SearchFilters) => {
    const filtered = state.carparks.filter(carpark => {
      // Distance filter
      if (carpark.distance && carpark.distance > filters.maxDistance) {
        return false;
      }

      // Price filter
      if (carpark.rates.hourly > filters.maxPrice) {
        return false;
      }

      // EV requirement filter
      if (filters.requireEV && carpark.availableEvLots === 0) {
        return false;
      }

      // Carpark type filter
      if (filters.carparkTypes.length > 0 && !filters.carparkTypes.includes(carpark.type)) {
        return false;
      }

      // Minimum availability filter
      const availabilityPercentage = carpark.totalLots 
        ? (carpark.availableLots / carpark.totalLots) * 100 
        : 0;
      if (availabilityPercentage < filters.minAvailability) {
        return false;
      }

      return true;
    });

    // Sort filtered results
    const sorted = [...filtered].sort((a, b) => {
      switch (filters.sortBy) {
        case 'distance':
          return (a.distance || 0) - (b.distance || 0);
        case 'price':
          return a.rates.hourly - b.rates.hourly;
        case 'availability':
          const aAvailability = a.totalLots ? (a.availableLots / a.totalLots) : 0;
          const bAvailability = b.totalLots ? (b.availableLots / b.totalLots) : 0;
          return bAvailability - aAvailability;
        default:
          return 0;
      }
    });

    dispatch({ type: 'SET_FILTERED_CARPARKS', payload: sorted });
  }, [state.carparks]);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const refreshCarparks = useCallback(async () => {
    await fetchCarparks();
  }, [fetchCarparks]);

  const value: CarparkContextType = useMemo(() => ({
    state,
    fetchCarparks,
    filterCarparks,
    clearError,
    refreshCarparks,
  }), [state, fetchCarparks, filterCarparks, clearError, refreshCarparks]);

  return <CarparkContext.Provider value={value}>{children}</CarparkContext.Provider>;
}

export function useCarparkContext() {
  const context = useContext(CarparkContext);
  if (context === undefined) {
    throw new Error('useCarparkContext must be used within a CarparkProvider');
  }
  return context;
}

export { CarparkContext };