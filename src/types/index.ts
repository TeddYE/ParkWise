export interface Carpark {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  coordinates: {
    lat: number;
    lng: number;
  };
  totalLots: number | null;
  availableLots: number;
  evLots: number;
  availableEvLots: number;
  rates: {
    hourly: number;
    daily: number;
    evCharging: number;
  };
  distance?: number;
  drivingTime?: number;
  type:
    | "Shopping Mall"
    | "HDB"
    | "Commercial"
    | "Entertainment"
    | "Hotel";
  features: string[];
  operatingHours: string;
  paymentMethods: string[];
  car_park_type: string;
  type_of_parking_system: string;
  lot_type: string;
}

export type ViewType =
  | "map"
  | "search"
  | "details"
  | "premium"
  | "pricing"
  | "login"
  | "signup"
  | "payment"
  | "profile";

export interface User {
  user_id: string;
  name?: string;
  email?: string;
  subscription: "free" | "premium";
  subscriptionExpiry?: Date;
  favoriteCarparks?: string[]; // Array of carpark IDs
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
}

// API Types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
  metadata?: {
    timestamp: Date;
    source: string;
    cached: boolean;
  };
}

export enum ApiErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface ApiError {
  type: ApiErrorType;
  message: string;
  details?: unknown;
  retryable: boolean;
}

// Cache Types
export interface CacheConfig {
  ttl: number;
  maxSize: number;
  strategy: 'LRU' | 'FIFO' | 'TTL';
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// Context State Types
export interface AppState {
  currentView: ViewType;
  selectedCarpark: Carpark | null;
  selectedPlan: "monthly" | "annual";
  loading: boolean;
  error: string | null;
}

export interface CarparkState {
  carparks: Carpark[];
  filteredCarparks: Carpark[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export interface SearchFilters {
  maxDistance: number;
  maxPrice: number;
  requireEV: boolean;
  carparkTypes: string[];
  minAvailability: number;
  sortBy: 'distance' | 'price' | 'availability';
}

export interface SearchState {
  query: string;
  filters: SearchFilters;
  location: SearchLocation | null;
  results: Carpark[];
  loading: boolean;
}

export interface SearchLocation {
  latitude: number;
  longitude: number;
  address?: string;
  postalCode?: string;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface MapState {
  userLocation: SearchLocation | null;
  mapBounds: MapBounds | null;
  selectedCarparkId: string | null;
  zoom: number;
  center: SearchLocation | null;
}

// API Response Types
export interface CarparkInfoApiResponse {
  carpark_number: string;
  address: string;
  car_park_type: string;
  type_of_parking_system: string;
  lot_type: string;
  x_coord: string; // API returns as string
  y_coord: string; // API returns as string
  total_lots?: number;
  current_rate_30min?: number;
  active_cap_amount?: number;
  parking_info?: {
    free_parking?: string;
    night_parking?: string;
    short_term_parking?: string;
  };
  gantry_height?: string;
  ev_lot_location?: string;
  name?: string; // Optional since not always present in API
}

export interface CarparkAvailabilityApiResponse {
  carpark_number: string;
  lots_available: string;
  timestamp?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  email: string;
  password: string;
}

export interface LoginApiResponse {
  ok: boolean;
  user_id: string;
  is_premium: string;
  subscription_end_date: string;
  fav_carparks: string; // JSON string array
}

export interface SignupApiResponse {
  ok: boolean;
  user_id: string;
  is_premium?: string;
  subscription_end_date?: string;
  fav_carparks?: string; // JSON string array
  error?: string;
}

export interface AuthResponse {
  user?: User;
  error?: string;
}

export interface SubscriptionRequest {
  user_id: string;
  subscription_end_date: string; // ISO date string
}

export interface SubscriptionResponse {
  user_id: string;
  subscription_end_date: string;
  success?: boolean;
  error?: string;
}

export interface FavoritesRequest {
  user_id: string;
  fav_carparks: string[]; // Array of carpark IDs
}

export interface FavoritesResponse {
  updated: boolean;
  error?: string;
}

export type SubscriptionPlan = "monthly" | "annual";

// Prediction Types
export interface PredictionRequest {
  carpark_number: string;
  datetime: string; // ISO 8601 format
}

export interface PredictionApiResponse {
  carpark_number: string;
  predictions: Array<{
    datetime: string;
    predicted_lots_available: number;
  }>;
}

export interface EnhancedPrediction {
  datetime: string;
  predicted_lots_available: number;
  availability_percentage: number;
  status: 'excellent' | 'good' | 'limited' | 'very_limited';
  is_optimal_time: boolean;
  is_peak_time: boolean;
  confidence_level: 'high' | 'medium' | 'low';
}

export interface PredictionAnalysis {
  best_times: Array<{
    time: string;
    availability: number;
    reason: string;
  }>;
  worst_times: Array<{
    time: string;
    availability: number;
    reason: string;
  }>;
  insights: string[];
  overall_trend: 'improving' | 'declining' | 'stable';
}

export interface PredictionResponse {
  carpark_number: string;
  predictions: EnhancedPrediction[];
  analysis: PredictionAnalysis;
  metadata: {
    generated_at: string;
    expires_at: string;
    total_lots?: number;
  };
}

export interface PredictionServiceResponse {
  data?: PredictionResponse;
  error?: string;
  cached?: boolean;
}