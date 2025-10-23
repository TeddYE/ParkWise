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