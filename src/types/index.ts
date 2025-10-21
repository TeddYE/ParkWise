// Enhanced Carpark interface with nested objects for better organization
export interface Carpark {
  id: string;
  name: string;
  address: string;
  location: {
    latitude: number;
    longitude: number;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  availability: {
    totalLots: number;
    availableLots: number;
    evLots: number;
    availableEvLots: number;
    lastUpdated: Date;
  };
  pricing: {
    hourly: number;
    daily: number;
    evCharging: number;
    currency: 'SGD';
  };
  metadata: {
    type: CarparkType;
    features: string[];
    operatingHours: string;
    paymentMethods: string[];
    carparkType: string;
    parkingSystem: string;
    lotType: string;
  };
  computed?: {
    distance?: number;
    drivingTime?: number;
    availabilityPercentage: number;
  };
}

// Carpark type definitions
export type CarparkType = 
  | "Shopping Mall"
  | "HDB"
  | "Commercial"
  | "Entertainment"
  | "Hotel";

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

// Enhanced User interface
export interface User {
  user_id: string;
  subscription: SubscriptionType;
  subscriptionExpiry?: Date;
  favoriteCarparks?: string[];
  profile?: UserProfile;
}

export type SubscriptionType = "free" | "premium";

export interface UserProfile {
  displayName?: string;
  email?: string;
  preferences: UserPreferences;
  createdAt: Date;
  lastLoginAt?: Date;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error?: string;
}

export interface UserPreferences {
  preferredDistance: number;
  budgetLimit: number;
  preferEV: boolean;
  preferCovered: boolean;
  sortBy: SortOption;
  theme: 'light' | 'dark' | 'system';
}

export type SortOption = 
  | 'distance'
  | 'availability'
  | 'price'
  | 'name';

// Search and filter types
export interface SearchFilters {
  maxDistance: number;
  maxPrice: number;
  requireEV: boolean;
  carparkTypes: CarparkType[];
  minAvailability: number;
  sortBy: SortOption;
}

export interface SearchLocation {
  latitude: number;
  longitude: number;
  address?: string;
  postalCode?: string;
}

export interface SearchState {
  query: string;
  filters: SearchFilters;
  location: SearchLocation | null;
  results: Carpark[];
  loading: boolean;
  error?: string;
}

// Map related types
export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface Location {
  latitude: number;
  longitude: number;
}

export interface MapState {
  center: Location;
  zoom: number;
  bounds?: MapBounds;
  selectedCarparkId?: string;
  userLocation?: Location;
}

// API Response Types
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

// Specific API response types
export interface CarparkInfoApiResponse {
  carpark_number: string;
  name: string;
  address: string;
  x_coord: number;
  y_coord: number;
  car_park_type: string;
  type_of_parking_system: string;
  lot_type: string;
}

export interface CarparkAvailabilityApiResponse {
  carpark_number: string;
  lots_available: string;
  timestamp: string;
}

export interface LoginApiResponse {
  user_id: string;
  profile?: {
    is_premium: string;
    subscriptionExpiry?: string;
    favoriteCarparks?: string[];
  };
}

export interface SignupApiResponse {
  user_id: string;
  profile?: {
    is_premium: string;
    subscriptionExpiry?: string;
    favoriteCarparks?: string[];
  };
}

// Error handling types
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

// Component prop interfaces with proper inheritance
export interface BaseComponentProps {
  className?: string;
  testId?: string;
}

export interface CarparkCardProps extends BaseComponentProps {
  carpark: Carpark;
  onSelect: (carpark: Carpark) => void;
  showDistance?: boolean;
  showAvailability?: boolean;
  variant?: 'compact' | 'detailed';
}

export interface SearchFiltersProps extends BaseComponentProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  isPremium: boolean;
}

export interface MapContainerProps extends BaseComponentProps {
  carparks: Carpark[];
  userLocation?: Location;
  selectedCarparkId?: string;
  onCarparkSelect: (carpark: Carpark) => void;
  onBoundsChange: (bounds: MapBounds) => void;
}

// Authentication related types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user?: User;
  error?: string;
}

// Validation types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface PasswordValidationResult extends ValidationResult {
  strength?: 'weak' | 'medium' | 'strong';
}

// Cache related types
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface CacheConfig {
  ttl: number;
  maxSize: number;
  strategy: 'LRU' | 'FIFO' | 'TTL';
}

// Application state types
export interface AppState {
  currentView: ViewType;
  selectedCarpark: Carpark | null;
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