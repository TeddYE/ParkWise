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