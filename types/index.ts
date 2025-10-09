export interface Carpark {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  totalLots: number;
  availableLots: number;
  evLots: number;
  availableEvLots: number;
  rates: {
    hourly: number;
    daily: number;
    evCharging: number;
  };
  distance: number;
  walkingTime: number;
  features: string[];
  operatingHours: string;
  paymentMethods: string[];
}

export interface PublicTransport {
  from: string;
  to: string;
  duration: string;
  transfers: number;
  cost: number;
  routes: string[];
}

export type ViewType = 'map' | 'search' | 'details' | 'premium' | 'pricing' | 'navigation';

export interface UserPreferences {
  preferredDistance: number;
  budgetLimit: number;
  preferEV: boolean;
  preferCovered: boolean;
}