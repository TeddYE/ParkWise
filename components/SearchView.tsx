import { useState } from 'react';
import { Search, Filter, MapPin, Car, Zap, Clock, DollarSign, SlidersHorizontal } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Slider } from './ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { mockCarparks } from '../data/mockData';
import { Carpark } from '../types';

interface SearchViewProps {
  onSelectCarpark: (carpark: Carpark) => void;
  onViewChange: (view: string) => void;
  isPremium: boolean;
}

export function SearchView({ onSelectCarpark, onViewChange, isPremium }: SearchViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [maxDistance, setMaxDistance] = useState([5]);
  const [maxPrice, setMaxPrice] = useState([10]);
  const [requireEV, setRequireEV] = useState(false);
  const [requireCovered, setRequireCovered] = useState(false);
  const [sortBy, setSortBy] = useState('distance');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const filteredCarparks = mockCarparks
    .filter(carpark => {
      if (searchQuery && !carpark.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !carpark.address.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (carpark.distance > maxDistance[0]) return false;
      if (carpark.rates.hourly > maxPrice[0]) return false;
      if (requireEV && carpark.availableEvLots === 0) return false;
      if (requireCovered && !carpark.features.includes('Covered')) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price': return a.rates.hourly - b.rates.hourly;
        case 'availability': return (b.availableLots / b.totalLots) - (a.availableLots / a.totalLots);
        case 'distance': 
        default: return a.distance - b.distance;
      }
    });

  const getAvailabilityColor = (available: number, total: number) => {
    const percentage = (available / total) * 100;
    if (percentage > 30) return 'text-green-600';
    if (percentage > 10) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* Search Header */}
      <div className="mb-6">
        <h1 className="text-2xl mb-4">Find Parking</h1>
        
        <div className="flex gap-3 mb-4">
          <div className="flex-1">
            <Input
              placeholder="Search by location, building name, or postal code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
          <Button 
            variant="outline"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
          </Button>
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-lg">Advanced Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Distance */}
                <div>
                  <label className="text-sm mb-2 block">Max Distance: {maxDistance[0]}km</label>
                  <Slider
                    value={maxDistance}
                    onValueChange={setMaxDistance}
                    max={10}
                    min={0.5}
                    step={0.5}
                    className="w-full"
                  />
                </div>

                {/* Price */}
                <div>
                  <label className="text-sm mb-2 block">Max Price: S${maxPrice[0]}/hr</label>
                  <Slider
                    value={maxPrice}
                    onValueChange={setMaxPrice}
                    max={15}
                    min={1}
                    step={0.5}
                    className="w-full"
                  />
                </div>

                {/* Sort */}
                <div>
                  <label className="text-sm mb-2 block">Sort By</label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="distance">Closest First</SelectItem>
                      <SelectItem value="price">Cheapest First</SelectItem>
                      <SelectItem value="availability">Most Available</SelectItem>
                      {isPremium && <SelectItem value="recommended">Recommended</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>

                {/* Features */}
                <div className="space-y-2">
                  <label className="text-sm block">Requirements</label>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="ev" 
                      checked={requireEV}
                      onCheckedChange={setRequireEV}
                    />
                    <label htmlFor="ev" className="text-sm">EV Charging Available</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="covered" 
                      checked={requireCovered}
                      onCheckedChange={setRequireCovered}
                    />
                    <label htmlFor="covered" className="text-sm">Covered Parking</label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Results */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg">
          {filteredCarparks.length} carpark{filteredCarparks.length !== 1 ? 's' : ''} found
        </h2>
        {!isPremium && filteredCarparks.length > 0 && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onViewChange('pricing')}
          >
            Get Smart Recommendations
          </Button>
        )}
      </div>

      {/* Carpark List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredCarparks.map((carpark) => (
          <Card 
            key={carpark.id} 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onSelectCarpark(carpark)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{carpark.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{carpark.address}</p>
                </div>
                <Badge variant="outline">
                  {carpark.distance}km
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {/* Availability Row */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Car className="w-4 h-4" />
                    <span className={`text-sm ${getAvailabilityColor(carpark.availableLots, carpark.totalLots)}`}>
                      {carpark.availableLots}/{carpark.totalLots} lots
                    </span>
                  </div>
                  {carpark.evLots > 0 && (
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-blue-600">
                        {carpark.availableEvLots}/{carpark.evLots} EV
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Info Row */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{carpark.walkingTime} min walk</span>
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  <span>S${carpark.rates.hourly}/hr</span>
                </div>
              </div>

              {/* Features */}
              <div className="flex flex-wrap gap-1 mt-3">
                {carpark.features.slice(0, 3).map((feature) => (
                  <Badge key={feature} variant="secondary" className="text-xs">
                    {feature}
                  </Badge>
                ))}
                {carpark.features.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{carpark.features.length - 3} more
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCarparks.length === 0 && (
        <div className="text-center py-12">
          <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg mb-2">No carparks found</h3>
          <p className="text-muted-foreground mb-4">
            Try adjusting your search criteria or expanding the search radius
          </p>
          <Button 
            variant="outline"
            onClick={() => {
              setMaxDistance([10]);
              setMaxPrice([15]);
              setRequireEV(false);
              setRequireCovered(false);
            }}
          >
            Reset Filters
          </Button>
        </div>
      )}
    </div>
  );
}