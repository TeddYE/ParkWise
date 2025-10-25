import { createContext, useContext, useReducer, ReactNode, useMemo, useCallback } from 'react';
import { AppState, ViewType, Carpark } from '../types';

interface AppContextType {
  state: AppState;
  setCurrentView: (view: ViewType) => void;
  setSelectedCarpark: (carpark: Carpark | null) => void;
  setSelectedPlan: (plan: "monthly" | "annual") => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

type AppAction =
  | { type: 'SET_CURRENT_VIEW'; payload: ViewType }
  | { type: 'SET_SELECTED_CARPARK'; payload: Carpark | null }
  | { type: 'SET_SELECTED_PLAN'; payload: "monthly" | "annual" }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

const initialState: AppState = {
  currentView: 'map',
  selectedCarpark: null,
  selectedPlan: 'monthly',
  loading: false,
  error: null,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_CURRENT_VIEW':
      return { ...state, currentView: action.payload };
    case 'SET_SELECTED_CARPARK':
      return { ...state, selectedCarpark: action.payload };
    case 'SET_SELECTED_PLAN':
      return { ...state, selectedPlan: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
}

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const setCurrentView = useCallback((view: ViewType) => {
    dispatch({ type: 'SET_CURRENT_VIEW', payload: view });
  }, []);

  const setSelectedCarpark = useCallback((carpark: Carpark | null) => {
    dispatch({ type: 'SET_SELECTED_CARPARK', payload: carpark });
  }, []);

  const setSelectedPlan = useCallback((plan: "monthly" | "annual") => {
    dispatch({ type: 'SET_SELECTED_PLAN', payload: plan });
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  }, []);

  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);

  const value: AppContextType = useMemo(() => ({
    state,
    setCurrentView,
    setSelectedCarpark,
    setSelectedPlan,
    setLoading,
    setError,
  }), [state, setCurrentView, setSelectedCarpark, setSelectedPlan, setLoading, setError]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}

export { AppContext };