import { useState, useEffect } from 'react';
import { Search, Filter, MapPin, Car, Zap, Clock, DollarSign, SlidersHorizontal, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Slider } from './ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Carpark } from '../types';
import { useCarparks } from '../hooks/useCarparks';
import { isPostalCode } from '../utils/postalCode';
import { geocodePostalCode, GeocodingResult } from '../services/geocodingService';
import { calculateDistance } from '../utils/distance';
import { getCarparkDisplayName } from '../utils/carpark';

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
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('distance');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [geocodingLoading, setGeocodingLoading] = useState(false);
  const [geocodedLocation, setGeocodedLocation] = useState<GeocodingResult | null>(null);
  const [geocodingError, setGeocodingError] = useState<string>('');

  // Fetch carparks from the API
  const { carparks, loading } = useCarparks();

  // Handle postal code geocoding
  useEffect(() => {
    const trimmedQuery = searchQuery.trim();
    
    // Reset geocoding state if query is not a postal code
    if (!isPostalCode(trimmedQuery)) {
      setGeocodedLocation(null);
      setGeocodingError('');
      return;
    }

    // Debounce the geocoding request
    const timeoutId = setTimeout(async () => {
      setGeocodingLoading(true);
      setGeocodingError('');
      
      const response = await geocodePostalCode(trimmedQuery);
      
      if (response.error) {
        setGeocodingError(response.error);
        setGeocodedLocation(null);
      } else if (response.result) {
        setGeocodedLocation(response.result);
        setGeocodingError('');
      }
      
      setGeocodingLoading(false);
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Calculate distances from geocoded location if available
  const carparksWithDistance = geocodedLocation
    ? carparks.map(carpark => ({
        ...carpark,
        distance: calculateDistance(
          geocodedLocation.latitude,
          geocodedLocation.longitude,
          carpark.latitude,
          carpark.longitude
        ),
      }))
    : carparks;

  const filteredCarparks = carparksWithDistance
    .filter(carpark => {
      if (searchQuery && !geocodedLocation) {
        // Regular text search (not postal code)
        const nameMatch = carpark.name?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
        const addressMatch = carpark.address?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
        if (!nameMatch && !addressMatch) {
          return false;
        }
      }
      if (carpark.distance !== undefined && carpark.distance > maxDistance[0]) return false;
      if (carpark.rates.hourly > maxPrice[0]) return false;
      if (isPremium && requireEV && carpark.evLots === 0) return false;
      if (isPremium && selectedTypes.length > 0 && !selectedTypes.includes(carpark.type)) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price': return a.rates.hourly - b.rates.hourly;
        case 'availability': {
          const aTotal = a.totalLots || 1;
          const bTotal = b.totalLots || 1;
          return (b.availableLots / bTotal) - (a.availableLots / aTotal);
        }
        case 'distance':
        default: 
          // Handle undefined distances (put them at the end)
          if (a.distance === undefined && b.distance === undefined) return 0;
          if (a.distance === undefined) return 1;
          if (b.distance === undefined) return -1;
          return a.distance - b.distance;
      }
    });

  const getAvailabilityColor = (available: number, total: number | null) => {
    if (total === null || total === 0) return 'text-gray-400';
    const percentage = (available / total) * 100;
    if (percentage > 30) return 'text-green-600';
    if (percentage > 10) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-3 sm:p-4">
      {/* Search Header */}
      <div className="mb-6">
        <h1 className="text-2xl mb-4">Find Parking</h1>
        
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1 relative">
            <Input
              placeholder="Search by location, name, or postal code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
            {geocodingLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
          <Button 
            variant="outline"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 justify-center sm:justify-start"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
            <span className="sm:hidden">Filters</span>
          </Button>
        </div>

        {/* Geocoding Status */}
        {geocodedLocation && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-2">
            <MapPin className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-green-900 dark:text-green-100">
                Searching near <span className="font-medium">{geocodedLocation.postalCode}</span>
              </p>
              {geocodedLocation.address && (
                <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                  {geocodedLocation.address}
                </p>
              )}
            </div>
          </div>
        )}

        {geocodingError && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-900 dark:text-red-100">
              {geocodingError}
            </p>
          </div>
        )}

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
                  <label className="text-sm mb-2 block">Max Price: S${maxPrice[0]}/30min</label>
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

                {/* Type Filter - Premium Only */}
                <div className="space-y-2">
                  <label className="text-sm block flex items-center gap-2">
                    Type
                    {!isPremium && <Badge variant="secondary" className="text-xs">Premium</Badge>}
                  </label>
                  <Select 
                    value={selectedTypes[0] || 'all'}
                    onValueChange={(value) => {
                      if (!isPremium) {
                        onViewChange('pricing');
                        return;
                      }
                      setSelectedTypes(value === 'all' ? [] : [value]);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="Shopping Mall">Shopping Mall</SelectItem>
                      <SelectItem value="HDB">HDB</SelectItem>
                      <SelectItem value="Commercial">Commercial</SelectItem>
                      <SelectItem value="Entertainment">Entertainment</SelectItem>
                      <SelectItem value="Hotel">Hotel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Requirements - Premium Only */}
                <div className="space-y-2">
                  <label className="text-sm block flex items-center gap-2">
                    Requirements
                    {!isPremium && <Badge variant="secondary" className="text-xs">Premium</Badge>}
                  </label>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="ev" 
                      checked={requireEV}
                      onCheckedChange={(checked) => {
                        if (!isPremium) {
                          onViewChange('pricing');
                          return;
                        }
                        setRequireEV(!!checked);
                      }}
                    />
                    <label htmlFor="ev" className="text-sm">EV Charging Available</label>
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
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base sm:text-lg line-clamp-2">{getCarparkDisplayName(carpark)}</CardTitle>
                  {carpark.name && carpark.name.trim() !== '' && (
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">{carpark.address || 'Address not available'}</p>
                  )}
                </div>
                <Badge variant="outline" className="flex-shrink-0 text-xs">
                  {carpark.distance !== undefined ? `${carpark.distance}km` : '-'}
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
                      {carpark.availableLots}/{carpark.totalLots !== null ? carpark.totalLots : 'N/A'} lots
                    </span>
                  </div>
                  {carpark.evLots > 0 && (
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-blue-600">
                        {carpark.evLots} EV Lots
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Info Row */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{carpark.drivingTime !== undefined ? `${carpark.drivingTime} min drive` : '- min drive'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  <span>S${carpark.rates.hourly}/30min</span>
                </div>
              </div>

              {/* Features */}
              <div className="flex flex-wrap gap-1 mt-3">
                <Badge variant="outline" className="text-xs">
                  {carpark.type}
                </Badge>
                {carpark.features?.slice(0, 2).map((feature) => (
                  <Badge key={feature} variant="secondary" className="text-xs">
                    {feature}
                  </Badge>
                ))}
                {carpark.features && carpark.features.length > 2 && (
                  <Badge variant="secondary" className="text-xs">
                    +{carpark.features.length - 2} more
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
              setSelectedTypes([]);
            }}
          >
            Reset Filters
          </Button>
        </div>
      )}
      </div>
    </div>
  );
}
