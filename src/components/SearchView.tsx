import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, MapPin, Car, Motorbike, Truck, Zap, Clock, DollarSign, SlidersHorizontal, Loader2, ChevronLeft, ChevronRight, Heart, Locate } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Slider } from './ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Carpark, User } from '../types';

import { isPostalCode } from '../utils/postalCode';
import { geocodePostalCode, GeocodingResult } from '../services/geocodingService';
import { calculateDistance } from '../utils/distance';
import { getCarparkDisplayName } from '../utils/carpark';
import { useDebounce } from '../hooks/useDebounce';
import { AdPlaceholder } from './ui/AdPlaceholder';

interface SearchViewProps {
  onSelectCarpark: (carpark: Carpark) => void;
  onViewChange: (view: string) => void;
  isPremium: boolean;
  user?: User;
  userLocation: { lat: number; lng: number } | null;
  onGetUserLocation: () => void;
  isLoadingLocation: boolean;
  carparks: Carpark[];
  isLoadingCarparks: boolean;
}

export function SearchView({ onSelectCarpark, onViewChange, isPremium, user, userLocation, onGetUserLocation, isLoadingLocation, carparks, isLoadingCarparks }: SearchViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [maxDistance, setMaxDistance] = useState([5]);
  const [maxPrice, setMaxPrice] = useState([10]);
  const [requireEV, setRequireEV] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('distance');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [geocodingLoading, setGeocodingLoading] = useState(false);
  const [geocodedLocation, setGeocodedLocation] = useState<GeocodingResult | null>(null);
  const [geocodingError, setGeocodingError] = useState<string>('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20); // Show 20 carparks per page

  // Debounce search query to prevent excessive filtering
  const debouncedSearchQuery = useDebounce(searchQuery, 300);



  // Handle postal code geocoding
  useEffect(() => {
    const trimmedQuery = debouncedSearchQuery.trim();

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
  }, [debouncedSearchQuery]);

  // Memoize distance calculations
  const carparksWithDistance = useMemo(() => {
    if (!geocodedLocation) return carparks;

    return carparks.map(carpark => ({
      ...carpark,
      distance: calculateDistance(
        geocodedLocation.latitude,
        geocodedLocation.longitude,
        carpark.latitude,
        carpark.longitude
      ),
    }));
  }, [carparks, geocodedLocation]);

  // Memoize filtered and sorted carparks
  const filteredCarparks = useMemo(() => {
    return carparksWithDistance
      .filter(carpark => {
        // Favorites filter
        if (showFavoritesOnly && user?.favoriteCarparks) {
          if (!user.favoriteCarparks.includes(carpark.id)) return false;
        }

        if (debouncedSearchQuery && !geocodedLocation) {
          // Regular text search (not postal code)
          const nameMatch = carpark.name?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) || false;
          const addressMatch = carpark.address?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) || false;
          if (!nameMatch && !addressMatch) {
            return false;
          }
        }
        if (carpark.distance !== undefined && carpark.distance > maxDistance[0]) return false;
        if (carpark.rates.hourly > maxPrice[0]) return false;
        if (isPremium && requireEV && carpark.evLots === 0) return false;
        if (isPremium && selectedTypes.length > 0) {
          // Check if carpark has the selected lot type with capacity > 0
          const hasSelectedLotType = carpark.lotDetails?.some(lot => 
            selectedTypes.includes(lot.lot_type) && lot.total_lots && lot.total_lots > 0
          );
          if (!hasSelectedLotType) return false;
        }
        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'price': return a.rates.hourly - b.rates.hourly;
          case 'availability': {
            // Sort by absolute available lots since totals are now N/A
            return b.availableLots - a.availableLots;
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
  }, [carparksWithDistance, debouncedSearchQuery, geocodedLocation, maxDistance, maxPrice, isPremium, requireEV, selectedTypes, sortBy, showFavoritesOnly, user?.favoriteCarparks]);

  // Memoize utility functions
  const getAvailabilityColor = useCallback((available: number, total: number | null) => {
    // Since totals are now N/A, use absolute availability numbers for color coding
    if (available > 50) return 'text-green-600';
    if (available > 20) return 'text-yellow-600';
    if (available > 0) return 'text-orange-600';
    return 'text-red-600';
  }, []);

  const handleToggleAdvanced = useCallback(() => {
    setShowAdvanced(!showAdvanced);
  }, [showAdvanced]);

  const handleResetFilters = useCallback(() => {
    setMaxDistance([10]);
    setMaxPrice([15]);
    setRequireEV(false);
    setSelectedTypes([]);
    setShowFavoritesOnly(false);
  }, []);



  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, maxDistance, maxPrice, requireEV, selectedTypes, sortBy, geocodedLocation, showFavoritesOnly]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredCarparks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCarparks = useMemo(() =>
    filteredCarparks.slice(startIndex, endIndex),
    [filteredCarparks, startIndex, endIndex]
  );

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    // Scroll to top of results
    document.querySelector('.search-results')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handlePrevPage = useCallback(() => {
    if (currentPage > 1) {
      handlePageChange(currentPage - 1);
    }
  }, [currentPage, handlePageChange]);

  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      handlePageChange(currentPage + 1);
    }
  }, [currentPage, totalPages, handlePageChange]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-3 sm:p-4">
        {/* Banner Ad for Free Users */}
        {!isPremium && (
          <div className="mb-6">
            <AdPlaceholder size="large" className="w-full" />
          </div>
        )}
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
            <div className="flex gap-2">
              {user?.favoriteCarparks && user.favoriteCarparks.length > 0 && (
                <Button
                  variant={showFavoritesOnly ? "default" : "outline"}
                  onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                  className="flex items-center gap-2"
                >
                  <Heart className={`w-4 h-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
                  <span className="hidden sm:inline">Favorites</span>
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleToggleAdvanced}
                className="flex items-center gap-2 justify-center sm:justify-start"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">Filters</span>
                <span className="sm:hidden">Filters</span>
              </Button>
            </div>
          </div>

          {/* Location Status - Show loading when location is being requested */}
          {!userLocation && isLoadingLocation && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center gap-3">
              <Locate className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-pulse" />
              <div className="flex-1">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  Getting your location for driving times...
                </p>
              </div>
            </div>
          )}

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

                  {/* Lot Type Filter - Premium Only */}
                  <div className="space-y-2">
                    <label className="text-sm block flex items-center gap-2">
                      Lot Type
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
                        <SelectValue placeholder="All Lot Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Lot Types</SelectItem>
                        <SelectItem value="C">Car Lots</SelectItem>
                        <SelectItem value="Y">Motorcycle Lots</SelectItem>
                        <SelectItem value="H">Heavy Vehicle Lots</SelectItem>
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

                  {/* Favorites Filter - Available to all logged-in users */}
                  {user?.favoriteCarparks && user.favoriteCarparks.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm block">Show Favorites</label>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="favorites"
                          checked={showFavoritesOnly}
                          onCheckedChange={(checked) => setShowFavoritesOnly(!!checked)}
                        />
                        <label htmlFor="favorites" className="text-sm">
                          Show only my favorites ({user.favoriteCarparks.length})
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Results */}
        <div className="mb-4 flex items-center justify-between search-results">
          <div>
            <h2 className="text-lg">
              {filteredCarparks.length} carpark{filteredCarparks.length !== 1 ? 's' : ''} found
            </h2>
            {filteredCarparks.length > itemsPerPage && (
              <p className="text-sm text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredCarparks.length)} of {filteredCarparks.length}
              </p>
            )}
          </div>

        </div>

        {/* Carpark List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {paginatedCarparks.map((carpark, index) => (
            <Card
              key={`search-${carpark.id}`}

                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => onSelectCarpark(carpark)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base sm:text-lg line-clamp-2">{getCarparkDisplayName(carpark)}</CardTitle>
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
                      <div className="flex flex-wrap items-center gap-2">
                        {carpark.lotDetails && carpark.lotDetails.length > 0 ? (
                          carpark.lotDetails.filter(lot => ['C', 'Y', 'H'].includes(lot.lot_type) && lot.total_lots && lot.total_lots > 0).map((lot) => {
                            const getLotIcon = (lotType: string) => {
                              switch (lotType) {
                                case 'C': return <Car className="w-4 h-4" />;
                                case 'Y': return <Motorbike className="w-4 h-4" />;
                                case 'H': return <Truck className="w-4 h-4" />;
                                default: return <Car className="w-4 h-4" />;
                              }
                            };

                            return (
                              <div key={lot.lot_type} className="flex items-center gap-1">
                                {getLotIcon(lot.lot_type)}
                                <span className={`text-sm ${getAvailabilityColor(lot.available_lots, lot.total_lots || null)}`}>
                                  {lot.available_lots}/{lot.total_lots || 'N/A'}
                                </span>
                              </div>
                            );
                          })
                        ) : (
                          <div className="flex items-center gap-2">
                            <Car className="w-4 h-4" />
                            <span className={`text-sm ${getAvailabilityColor(carpark.availableLots, carpark.totalLots)}`}>
                              {carpark.availableLots}/N/A lots
                            </span>
                          </div>
                        )}
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

        {/* Pagination */}
        {filteredCarparks.length > itemsPerPage && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>

            <div className="flex items-center gap-1">
              {/* Show page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(pageNum)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNum}
                  </Button>
                );
              })}

              {totalPages > 5 && currentPage < totalPages - 2 && (
                <>
                  <span className="px-2 text-muted-foreground">...</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(totalPages)}
                    className="w-8 h-8 p-0"
                  >
                    {totalPages}
                  </Button>
                </>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {filteredCarparks.length === 0 && (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg mb-2">No carparks found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search criteria or expanding the search radius
            </p>
            <Button
              variant="outline"
              onClick={handleResetFilters}
            >
              Reset Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
