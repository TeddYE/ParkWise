import { createContext, useContext, useReducer, useCallback, ReactNode, useMemo } from 'react';
import { MapState, SearchLocation, MapBounds } from '../types';

interface MapContextType {
  state: MapState;
  setUserLocation: (location: SearchLocation | null) => void;
  setMapBounds: (bounds: MapBounds | null) => void;
  setSelectedCarparkId: (id: string | null) => void;
  setZoom: (zoom: number) => void;
  setCenter: (center: SearchLocation | null) => void;
  updateMapView: (center: SearchLocation, zoom: number) => void;
}

const MapContext = createContext<MapContextType | undefined>(undefined);

type MapAction =
  | { type: 'SET_USER_LOCATION'; payload: SearchLocation | null }
  | { type: 'SET_MAP_BOUNDS'; payload: MapBounds | null }
  | { type: 'SET_SELECTED_CARPARK_ID'; payload: string | null }
  | { type: 'SET_ZOOM'; payload: number }
  | { type: 'SET_CENTER'; payload: SearchLocation | null }
  | { type: 'UPDATE_MAP_VIEW'; payload: { center: SearchLocation; zoom: number } };

const initialState: MapState = {
  userLocation: null,
  mapBounds: null,
  selectedCarparkId: null,
  zoom: 12,
  center: {
    latitude: 1.3521,
    longitude: 103.8198, // Singapore center
  },
};

function mapReducer(state: MapState, action: MapAction): MapState {
  switch (action.type) {
    case 'SET_USER_LOCATION':
      return { ...state, userLocation: action.payload };
    case 'SET_MAP_BOUNDS':
      return { ...state, mapBounds: action.payload };
    case 'SET_SELECTED_CARPARK_ID':
      return { ...state, selectedCarparkId: action.payload };
    case 'SET_ZOOM':
      return { ...state, zoom: action.payload };
    case 'SET_CENTER':
      return { ...state, center: action.payload };
    case 'UPDATE_MAP_VIEW':
      return {
        ...state,
        center: action.payload.center,
        zoom: action.payload.zoom,
      };
    default:
      return state;
  }
}

interface MapProviderProps {
  children: ReactNode;
}

export function MapProvider({ children }: MapProviderProps) {
  const [state, dispatch] = useReducer(mapReducer, initialState);

  const setUserLocation = useCallback((location: SearchLocation | null) => {
    dispatch({ type: 'SET_USER_LOCATION', payload: location });
  }, []);

  const setMapBounds = useCallback((bounds: MapBounds | null) => {
    dispatch({ type: 'SET_MAP_BOUNDS', payload: bounds });
  }, []);

  const setSelectedCarparkId = useCallback((id: string | null) => {
    dispatch({ type: 'SET_SELECTED_CARPARK_ID', payload: id });
  }, []);

  const setZoom = useCallback((zoom: number) => {
    dispatch({ type: 'SET_ZOOM', payload: zoom });
  }, []);

  const setCenter = useCallback((center: SearchLocation | null) => {
    dispatch({ type: 'SET_CENTER', payload: center });
  }, []);

  const updateMapView = useCallback((center: SearchLocation, zoom: number) => {
    dispatch({ type: 'UPDATE_MAP_VIEW', payload: { center, zoom } });
  }, []);

  const value: MapContextType = useMemo(() => ({
    state,
    setUserLocation,
    setMapBounds,
    setSelectedCarparkId,
    setZoom,
    setCenter,
    updateMapView,
  }), [state, setUserLocation, setMapBounds, setSelectedCarparkId, setZoom, setCenter, updateMapView]);

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
}

export function useMapContext() {
  const context = useContext(MapContext);
  if (context === undefined) {
    throw new Error('useMapContext must be used within a MapProvider');
  }
  return context;
}

export { MapContext };