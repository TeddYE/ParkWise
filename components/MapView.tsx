import { useState } from 'react';
import { MapPin, Navigation, Car, Zap, Clock, DollarSign, Filter } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Slider } from './ui/slider';
import { mockCarparks } from '../data/mockData';
import { Carpark } from '../types';

interface MapViewProps {
  onViewChange: (view: string) => void;
  onSelectCarpark: (carpark: Carpark) => void;
  isPremium: boolean;
}

export function MapView({ onViewChange, onSelectCarpark, isPremium }: MapViewProps) {
  const [searchRadius, setSearchRadius] = useState([5]);
  const [selectedCarpark, setSelectedCarpark] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const handleCarparkClick = (carpark: Carpark) => {
    setSelectedCarpark(carpark.id);
    onSelectCarpark(carpark);
  };

  const getAvailabilityColor = (available: number, total: number) => {
    const percentage = (available / total) * 100;
    if (percentage > 30) return 'bg-green-500';
    if (percentage > 10) return 'bg-yellow-500'; 
    return 'bg-red-500';
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-80 border-r bg-card overflow-y-auto">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-3">
            <Input 
              placeholder="Search by location, postal code..." 
              className="flex-1"
            />
            <Button size="icon" variant="outline" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="w-4 h-4" />
            </Button>
          </div>
          
          {showFilters && (
            <div className="space-y-3 p-3 bg-muted rounded-lg">
              <div>
                <label className="text-sm mb-2 block">Search Radius: {searchRadius[0]}km</label>
                <Slider
                  value={searchRadius}
                  onValueChange={setSearchRadius}
                  max={10}
                  min={1}
                  step={0.5}
                  className="w-full"
                />
              </div>
            </div>
          )}
        </div>

        <div className="p-4">
          <h3 className="mb-3">Nearby Carparks ({mockCarparks.length})</h3>
          <div className="space-y-3">
            {mockCarparks.map((carpark) => (
              <Card 
                key={carpark.id} 
                className={`cursor-pointer transition-all ${
                  selectedCarpark === carpark.id ? 'ring-2 ring-primary' : 'hover:shadow-md'
                }`}
                onClick={() => handleCarparkClick(carpark)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-sm">{carpark.name}</CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {carpark.distance}km
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{carpark.address}</p>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Car className="w-3 h-3" />
                        <span className="text-sm">{carpark.availableLots}/{carpark.totalLots}</span>
                      </div>
                      <div 
                        className={`w-2 h-2 rounded-full ${getAvailabilityColor(carpark.availableLots, carpark.totalLots)}`}
                      />
                    </div>
                    {carpark.evLots > 0 && (
                      <div className="flex items-center gap-1">
                        <Zap className="w-3 h-3 text-blue-600" />
                        <span className="text-sm">{carpark.availableEvLots}/{carpark.evLots}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{carpark.walkingTime} min walk</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      <span>S${carpark.rates.hourly}/hr</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative bg-gray-100">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center p-8 bg-white rounded-lg shadow-lg">
            <MapPin className="w-16 h-16 text-primary mx-auto mb-4" />
            <h3 className="text-lg mb-2">Interactive Map View</h3>
            <p className="text-muted-foreground mb-4">
              Real carpark locations would be displayed here with live availability indicators
            </p>
            {!isPremium && (
              <Card className="max-w-sm mx-auto">
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-2">🎯 Want smarter recommendations?</p>
                  <Button 
                    size="sm" 
                    onClick={() => onViewChange('pricing')}
                    className="w-full"
                  >
                    Upgrade to Premium
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Map Controls */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <Button size="icon" variant="outline" className="bg-white">
            <Navigation className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="outline" className="bg-white">
            <MapPin className="w-4 h-4" />
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex gap-2 justify-center">
            <Button 
              variant="outline" 
              className="bg-white"
              onClick={() => onViewChange('search')}
            >
              Advanced Search
            </Button>
            {isPremium && (
              <Button 
                variant="outline" 
                className="bg-white"
                onClick={() => onViewChange('premium')}
              >
                Smart Recommendations
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}