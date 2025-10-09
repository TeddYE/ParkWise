import { Carpark, PublicTransport } from '../types';

export const mockCarparks: Carpark[] = [
  {
    id: 'cp001',
    name: 'Marina Bay Sands',
    address: '10 Bayfront Ave, Singapore 018956',
    latitude: 1.2834,
    longitude: 103.8607,
    totalLots: 2500,
    availableLots: 450,
    evLots: 50,
    availableEvLots: 12,
    rates: {
      hourly: 4.50,
      daily: 35.00,
      evCharging: 0.60
    },
    distance: 0.8,
    walkingTime: 10,
    features: ['Covered', 'EV Charging', 'Valet Service', 'Security'],
    operatingHours: '24/7',
    paymentMethods: ['CashCard', 'Credit Card', 'Mobile Payment']
  },
  {
    id: 'cp002', 
    name: 'Raffles City Shopping Centre',
    address: '252 North Bridge Rd, Singapore 179103',
    latitude: 1.2939,
    longitude: 103.8535,
    totalLots: 800,
    availableLots: 125,
    evLots: 20,
    availableEvLots: 5,
    rates: {
      hourly: 3.20,
      daily: 25.00,
      evCharging: 0.55
    },
    distance: 1.2,
    walkingTime: 15,
    features: ['Covered', 'EV Charging', 'Mall Access'],
    operatingHours: '6:00 AM - 12:00 AM',
    paymentMethods: ['CashCard', 'Credit Card']
  },
  {
    id: 'cp003',
    name: 'ION Orchard',
    address: '2 Orchard Turn, Singapore 238801', 
    latitude: 1.3042,
    longitude: 103.8314,
    totalLots: 1200,
    availableLots: 89,
    evLots: 30,
    availableEvLots: 8,
    rates: {
      hourly: 5.00,
      daily: 40.00,
      evCharging: 0.65
    },
    distance: 2.1,
    walkingTime: 25,
    features: ['Covered', 'EV Charging', 'Premium Location', 'Valet Service'],
    operatingHours: '24/7',
    paymentMethods: ['CashCard', 'Credit Card', 'Mobile Payment']
  },
  {
    id: 'cp004',
    name: 'Chinatown Point',
    address: '133 New Bridge Rd, Singapore 059413',
    latitude: 1.2857,
    longitude: 103.8448,
    totalLots: 400,
    availableLots: 78,
    evLots: 15,
    availableEvLots: 3,
    rates: {
      hourly: 2.80,
      daily: 20.00,
      evCharging: 0.50
    },
    distance: 1.5,
    walkingTime: 18,
    features: ['Covered', 'EV Charging', 'Budget Friendly'],
    operatingHours: '6:00 AM - 11:00 PM',
    paymentMethods: ['CashCard', 'Credit Card']
  },
  {
    id: 'cp005',
    name: 'Clarke Quay Central',
    address: '6 Eu Tong Sen St, Singapore 059817',
    latitude: 1.2883,
    longitude: 103.8467,
    totalLots: 600,
    availableLots: 156,
    evLots: 25,
    availableEvLots: 7,
    rates: {
      hourly: 3.50,
      daily: 28.00,
      evCharging: 0.58
    },
    distance: 1.8,
    walkingTime: 22,
    features: ['Covered', 'EV Charging', 'Entertainment District'],
    operatingHours: '24/7',
    paymentMethods: ['CashCard', 'Credit Card', 'Mobile Payment']
  },
  {
    id: 'cp006',
    name: 'Bugis Junction',
    address: '200 Victoria St, Singapore 188021',
    latitude: 1.2993,
    longitude: 103.8555,
    totalLots: 750,
    availableLots: 203,
    evLots: 18,
    availableEvLots: 4,
    rates: {
      hourly: 3.00,
      daily: 22.00,
      evCharging: 0.52
    },
    distance: 2.3,
    walkingTime: 28,
    features: ['Covered', 'EV Charging', 'Shopping Mall'],
    operatingHours: '7:00 AM - 11:00 PM',
    paymentMethods: ['CashCard', 'Credit Card']
  }
];

export const mockPublicTransport: PublicTransport[] = [
  {
    from: 'Current Location',
    to: 'Marina Bay Sands',
    duration: '18 mins',
    transfers: 1,
    cost: 2.10,
    routes: ['Downtown Line', 'Bayfront Station']
  },
  {
    from: 'Current Location', 
    to: 'Raffles City',
    duration: '12 mins',
    transfers: 0,
    cost: 1.80,
    routes: ['City Hall Station']
  },
  {
    from: 'Current Location',
    to: 'ION Orchard',
    duration: '15 mins',
    transfers: 0,
    cost: 1.90,
    routes: ['Orchard Station']
  }
];