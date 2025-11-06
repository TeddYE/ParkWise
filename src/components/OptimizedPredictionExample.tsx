import { useState } from 'react';
import { CarparkPredictionView } from './CarparkPredictionView';
import { Button } from './ui/button';
import { Carpark } from '../types';

/**
 * Example component showing optimized prediction loading
 * Demonstrates lazy loading and caching behavior
 */
export function OptimizedPredictionExample() {
  const [selectedCarpark, setSelectedCarpark] = useState<Carpark | null>(null);

  // Mock carpark data
  const mockCarparks: Carpark[] = [
    {
      id: 'C123',
      name: 'Marina Bay Carpark',
      address: '123 Marina Bay Street',
      latitude: 1.2966,
      longitude: 103.8547,
      coordinates: { lat: 1.2966, lng: 103.8547 },
      totalLots: 150,
      availableLots: 45,
      lotDetails: [
        { lot_type: 'C', available_lots: 45, total_lots: 150 }
      ],
      evLots: 10,
      availableEvLots: 3,
      rates: { hourly: 2.5, daily: 15.0, evCharging: 0.5 },
      type: 'Commercial',
      features: ['Covered', 'EV Charging', '24/7'],
      operatingHours: '24/7',
      paymentMethods: ['Cash', 'Card', 'Mobile'],
      car_park_type: 'SURFACE',
      type_of_parking_system: 'ELECTRONIC',
      lot_type: 'C',
    },
    {
      id: 'C456',
      name: 'Orchard Shopping Mall',
      address: '456 Orchard Road',
      latitude: 1.3048,
      longitude: 103.8318,
      coordinates: { lat: 1.3048, lng: 103.8318 },
      totalLots: 200,
      availableLots: 78,
      lotDetails: [
        { lot_type: 'C', available_lots: 78, total_lots: 200 }
      ],
      evLots: 15,
      availableEvLots: 8,
      rates: { hourly: 3.0, daily: 20.0, evCharging: 0.6 },
      type: 'Shopping Mall',
      features: ['Covered', 'EV Charging', 'Valet'],
      operatingHours: '6:00 AM - 12:00 AM',
      paymentMethods: ['Cash', 'Card', 'Mobile', 'Voucher'],
      car_park_type: 'MULTI-STOREY',
      type_of_parking_system: 'ELECTRONIC',
      lot_type: 'C',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Optimized Prediction Loading Demo</h1>
        <p className="text-muted-foreground">
          This demo shows how predictions are only loaded when you select a carpark (lazy loading)
          and how subsequent selections use cached data for 30 minutes.
        </p>
      </div>

      {/* Carpark Selection */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Select a Carpark</h2>
        <div className="flex gap-3">
          {mockCarparks.map((carpark) => (
            <Button
              key={carpark.id}
              variant={selectedCarpark?.id === carpark.id ? 'default' : 'outline'}
              onClick={() => setSelectedCarpark(carpark)}
            >
              {carpark.name}
            </Button>
          ))}
          <Button
            variant="ghost"
            onClick={() => setSelectedCarpark(null)}
          >
            Clear Selection
          </Button>
        </div>
      </div>

      {/* Performance Notes */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
        <h3 className="font-medium">Performance Features:</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• <strong>Lazy Loading:</strong> API calls only happen when you select a carpark</li>
          <li>• <strong>30-minute Cache:</strong> Subsequent selections use cached data</li>
          <li>• <strong>Request Deduplication:</strong> Multiple rapid clicks won't trigger multiple API calls</li>
          <li>• <strong>Background Cleanup:</strong> Expired cache entries are automatically removed</li>
          <li>• <strong>Smart Refresh:</strong> Manual refresh bypasses cache when needed</li>
        </ul>
      </div>

      {/* Prediction View */}
      {selectedCarpark && (
        <div className="border rounded-lg">
          <CarparkPredictionView carpark={selectedCarpark} />
        </div>
      )}

      {/* Instructions */}
      {!selectedCarpark && (
        <div className="text-center py-12 text-muted-foreground">
          <p>Select a carpark above to see the optimized prediction loading in action.</p>
          <p className="text-sm mt-2">
            Notice how the first load fetches from API, but switching back uses cached data.
          </p>
        </div>
      )}
    </div>
  );
}

export default OptimizedPredictionExample;