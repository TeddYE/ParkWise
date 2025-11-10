import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import {
  MapPin,
  Navigation,
  Zap,
  Clock,
  DollarSign,
  Filter,
  Locate,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Heart,
  RefreshCw,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { Carpark, User, getCarparkAvailableLots, getCarparkTotalLots } from "../types";
import { LeafletMap } from "./LeafletMap";

import { getCarparkDisplayName, formatCarparkType, getAvailabilityBgColor } from "../utils/carpark";
import { getLotTypeLabel } from "../utils/lotTypes";
import { LotDetailsDisplay } from "./LotDetailsDisplay";
import { calculateDistance } from "../utils/distance";
import { isPostalCode } from "../utils/postalCode";
import { geocodePostalCode, geocodeSearch } from "../services/geocodingService";
import { toast } from "sonner";
import { AuthService } from "../services/authService";
import { AdPlaceholder } from "./ui/AdPlaceholder";

const MAX_MAP_CARPARKS = 60;

interface MapViewProps {
  onViewChange: (view: string) => void;
  onSelectCarpark: (carpark: Carpark) => void;
  isPremium: boolean;
  user?: User;
  onUpdateUser?: (user: User) => void;
  userLocation: { lat: number; lng: number } | null;
  isLoadingLocation: boolean;
  carparks: Carpark[];
  isLoadingCarparks: boolean;
  onRefreshCarparks: () => Promise<void>;
}

export function MapView({
  onViewChange,
  onSelectCarpark,
  isPremium,
  user,
  onUpdateUser,
  userLocation,
  isLoadingLocation,
  carparks,
  isLoadingCarparks,
  onRefreshCarparks,
}: MapViewProps) {
  const [searchRadius] = useState([5]);
  const [selectedCarpark, setSelectedCarpark] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [visibleCount, setVisibleCount] = useState(5);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [mapBounds, setMapBounds] = useState<{
    north: number;
    south: number;
    east: number;
    west: number;
  } | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchLocation, setSearchLocation] = useState<{
    lat: number;
    lng: number;
    address?: string;
  } | null>(null);
  const [selectedLotTypes, setSelectedLotTypes] = useState<string[]>(['C', 'Y', 'H']);
  const [selectedCarparkTypes, setSelectedCarparkTypes] = useState<string[]>([]);
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);







  // Memoize event handlers
  const handleRefresh = useCallback(async () => {
    await onRefreshCarparks();
    toast.success('Carpark data refreshed', {
      description: 'Availability data has been updated',
      duration: 2000,
    });
  }, [onRefreshCarparks]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchLocation(null);
      return;
    }

    setIsSearching(true);

    try {
      // Check if it's a postal code
      if (isPostalCode(searchQuery)) {
        console.log('Searching for postal code:', searchQuery);
        const result = await geocodePostalCode(searchQuery);

        if (result.error) {
          toast.error(result.error);
          setIsSearching(false);
          return;
        }

        if (result.result) {
          setSearchLocation({
            lat: result.result.latitude,
            lng: result.result.longitude,
            address: result.result.address,
          });
          toast.success(`Found location: ${result.result.address}`);
        }
      } else {
        // General search (address, place name, etc.)
        console.log('Searching for location:', searchQuery);
        const result = await geocodeSearch(searchQuery);

        if (result.error) {
          toast.error(result.error);
          setIsSearching(false);
          return;
        }

        if (result.result) {
          setSearchLocation({
            lat: result.result.latitude,
            lng: result.result.longitude,
            address: result.result.address,
          });
          toast.success(`Found location: ${result.result.address}`);
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchLocation(null);
  }, []);

  const handleToggleFavorite = useCallback(async (carparkId: string, event?: React.MouseEvent) => {
    // Prevent card click when clicking heart
    if (event) {
      event.stopPropagation();
    }

    if (!user || !onUpdateUser) {
      toast.error('Please sign up to save favorites', {
        dismissible: true,
        closeButton: true,
      });
      onViewChange('login');
      return;
    }

    const currentFavorites = user.favoriteCarparks || [];
    const isFavorite = currentFavorites.includes(carparkId);
    const updatedFavorites = isFavorite
      ? currentFavorites.filter(id => id !== carparkId)
      : [...currentFavorites, carparkId];

    // Optimistically update UI
    onUpdateUser({
      ...user,
      favoriteCarparks: updatedFavorites,
    });

    // Call API to update favorites
    const response = await AuthService.toggleFavoriteCarpark(user, carparkId);

    if (response.user) {
      onUpdateUser(response.user);
      toast.success(response.action === 'added' ? 'Added to favorites' : 'Removed from favorites', {
        dismissible: true,
        closeButton: true,
      });
    } else {
      // Revert on failure
      onUpdateUser(user);
      toast.error(response.error || 'Failed to update favorites', {
        dismissible: true,
        closeButton: true,
      });
    }
  }, [user, onUpdateUser, onViewChange]);

  // Memoize unique filter options
  const uniqueLotTypes = useMemo(() => Array.from(
    new Set(
      carparks
        .flatMap((cp) => cp.lotDetails?.map(lot => lot.lot_type) || [])
        .filter((type) => type && type.trim() !== "" && ['C', 'Y', 'H'].includes(type))
    )
  ).sort(), [carparks]);

  const uniqueCarparkTypes = useMemo(() => Array.from(
    new Set(
      carparks
        .map((cp) => cp.car_park_type)
        .filter((type) => type && type.trim() !== "")
    )
  ).sort(), [carparks]);

  const uniquePaymentMethods = useMemo(() => Array.from(
    new Set(
      carparks
        .flatMap((cp) => cp.paymentMethods)
        .filter((method) => method && method.trim() !== "")
    )
  ).sort(), [carparks]);



  // Toggle lot type filter
  const toggleLotType = (lotType: string) => {
    setSelectedLotTypes((prev) =>
      prev.includes(lotType)
        ? prev.filter((t) => t !== lotType)
        : [...prev, lotType]
    );
  };

  // Toggle carpark type filter
  const toggleCarparkType = (carparkType: string) => {
    setSelectedCarparkTypes((prev) =>
      prev.includes(carparkType)
        ? prev.filter((t) => t !== carparkType)
        : [...prev, carparkType]
    );
  };

  // Toggle payment method filter
  const togglePaymentMethod = (paymentMethod: string) => {
    setSelectedPaymentMethods((prev) =>
      prev.includes(paymentMethod)
        ? prev.filter((m) => m !== paymentMethod)
        : [...prev, paymentMethod]
    );
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedLotTypes(['C', 'Y', 'H']); // Select all lot types by default
    setSelectedCarparkTypes([]);
    setSelectedPaymentMethods([]);
    setShowFavoritesOnly(false);
  };

  // Filter carparks by search query or map bounds
  const carparksInBounds = useMemo(() => {
    let filtered = carparks;

    // If there's a search location (postal code or address search)
    if (searchLocation) {
      // Filter by distance from search location
      const radius = searchRadius[0]; // in km
      filtered = carparks
        .map((carpark) => ({
          ...carpark,
          searchDistance: calculateDistance(
            searchLocation.lat,
            searchLocation.lng,
            carpark.latitude,
            carpark.longitude
          ),
        }))
        .filter((carpark) => carpark.searchDistance <= radius)
        .sort((a, b) => a.searchDistance - b.searchDistance);
    }
    // If there's a text search query (not postal code, not geocoded yet)
    else if (searchQuery.trim() && !isPostalCode(searchQuery)) {
      // Filter by address text match
      const query = searchQuery.toLowerCase();
      filtered = carparks.filter((carpark) => {
        const address = (carpark.address || '').toLowerCase();
        const name = (carpark.name || '').toLowerCase();
        return address.includes(query) || name.includes(query);
      });
    }
    // Default: filter by map bounds
    else if (mapBounds) {
      filtered = carparks.filter((carpark) => {
        return (
          carpark.latitude >= mapBounds.south &&
          carpark.latitude <= mapBounds.north &&
          carpark.longitude >= mapBounds.west &&
          carpark.longitude <= mapBounds.east
        );
      });
    }

    // Apply lot type filter (free feature)
    if (selectedLotTypes.length > 0) {
      filtered = filtered.filter((carpark) => {
        // Check if carpark has any of the selected lot types with capacity > 0
        if (carpark.lotDetails && carpark.lotDetails.length > 0) {
          const availableLotTypes = carpark.lotDetails
            .filter(lot => lot.total_lots && lot.total_lots > 0)
            .map(lot => lot.lot_type);
          return selectedLotTypes.some(selectedType => availableLotTypes.includes(selectedType));
        }
        return false;
      });
    }

    // Apply carpark type filter (free feature)
    if (selectedCarparkTypes.length > 0) {
      filtered = filtered.filter((carpark) =>
        selectedCarparkTypes.includes(carpark.car_park_type)
      );
    }

    // Apply payment method filter (free feature)
    if (selectedPaymentMethods.length > 0) {
      filtered = filtered.filter((carpark) =>
        carpark.paymentMethods.some(method =>
          selectedPaymentMethods.includes(method)
        )
      );
    }

    // Apply favorites filter
    if (showFavoritesOnly && user?.favoriteCarparks) {
      filtered = filtered.filter((carpark) =>
        user.favoriteCarparks!.includes(carpark.id)
      );
    }

    return filtered;
  }, [
    carparks,
    searchLocation,
    searchRadius,
    searchQuery,
    mapBounds,
    selectedLotTypes,
    selectedCarparkTypes,
    selectedPaymentMethods,
    showFavoritesOnly,
    user?.favoriteCarparks
  ]);

  /**
   * Smart carpark filtering for map display
   * 1. Filters by viewport bounds
   * 2. Calculates distance from map center for each carpark
   * 3. Sorts by distance from center (closest to center first)
   * 4. Limits to MAX_MAP_CARPARKS
   */
  const carparksForMap = useMemo((): Carpark[] => {
    if (!mapBounds || carparksInBounds.length === 0) return [];

    // If we have fewer carparks than the limit, return all
    if (carparksInBounds.length <= MAX_MAP_CARPARKS) {
      return carparksInBounds;
    }

    // For better distribution, divide the map into a grid and select carparks from each cell
    const gridSize = Math.ceil(Math.sqrt(MAX_MAP_CARPARKS)); // e.g., 6x6 grid for 30 carparks
    const latStep = (mapBounds.north - mapBounds.south) / gridSize;
    const lngStep = (mapBounds.east - mapBounds.west) / gridSize;

    const selectedCarparks: Carpark[] = [];
    const carparksPerCell = Math.ceil(MAX_MAP_CARPARKS / (gridSize * gridSize));

    // Create grid cells and select carparks from each
    for (let i = 0; i < gridSize && selectedCarparks.length < MAX_MAP_CARPARKS; i++) {
      for (let j = 0; j < gridSize && selectedCarparks.length < MAX_MAP_CARPARKS; j++) {
        const cellSouth = mapBounds.south + (i * latStep);
        const cellNorth = mapBounds.south + ((i + 1) * latStep);
        const cellWest = mapBounds.west + (j * lngStep);
        const cellEast = mapBounds.west + ((j + 1) * lngStep);

        // Find carparks in this cell
        const cellCarparks = carparksInBounds.filter(carpark =>
          carpark.latitude >= cellSouth &&
          carpark.latitude < cellNorth &&
          carpark.longitude >= cellWest &&
          carpark.longitude < cellEast
        );

        // Select the best carparks from this cell (by availability)
        const sortedCellCarparks = cellCarparks
          .sort((a, b) => getCarparkAvailableLots(b) - getCarparkAvailableLots(a))
          .slice(0, carparksPerCell);

        selectedCarparks.push(...sortedCellCarparks);
      }
    }

    // If we still have space and there are unselected carparks, fill with the best remaining ones
    if (selectedCarparks.length < MAX_MAP_CARPARKS) {
      const selectedIds = new Set(selectedCarparks.map(cp => cp.id));
      const remainingCarparks = carparksInBounds
        .filter(cp => !selectedIds.has(cp.id))
        .sort((a, b) => getCarparkAvailableLots(b) - getCarparkAvailableLots(a))
        .slice(0, MAX_MAP_CARPARKS - selectedCarparks.length);

      selectedCarparks.push(...remainingCarparks);
    }

    return selectedCarparks.slice(0, MAX_MAP_CARPARKS);
  }, [carparksInBounds, mapBounds]);



  // Reset visible count when carparks change
  useEffect(() => {
    setVisibleCount(5);
  }, [carparksInBounds.length]);



  // Handle map bounds change
  const handleBoundsChange = useCallback(
    (bounds: {
      north: number;
      south: number;
      east: number;
      west: number;
    }) => {
      setMapBounds(bounds);
    },
    [],
  );



  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom =
      scrollTop + clientHeight >= scrollHeight - 50;

    if (
      isNearBottom &&
      visibleCount < carparksInBounds.length
    ) {
      setVisibleCount((prev) =>
        Math.min(prev + 5, carparksInBounds.length),
      );
    }
  }, [visibleCount, carparksInBounds.length]);

  const handleCarparkClick = (carpark: Carpark) => {
    setSelectedCarpark(carpark.id);
    onSelectCarpark(carpark);
  };

  return (
    <div className="flex h-full bg-background overflow-hidden relative">
      {/* Sidebar - Fixed height with internal scroll */}
      <div className={`
        ${isSidebarOpen ? 'w-80' : 'w-0'}
        md:w-80
        border-r bg-card flex flex-col overflow-hidden
        transition-all duration-300 ease-in-out
        absolute md:relative z-10 h-full
        ${!isSidebarOpen && 'border-r-0'}
        ${isSidebarOpen ? 'shadow-2xl md:shadow-none' : ''}
      `}>
        {/* Fixed header section */}
        <div className="p-4 border-b flex-shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Input
                placeholder="Search by location, postal code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
                className="pr-8"
              />
              {searchQuery && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute right-0 top-0 h-full"
                  onClick={clearSearch}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            <Button
              size="icon"
              variant="outline"
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
            >
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
            {user?.favoriteCarparks && user.favoriteCarparks.length > 0 && (
              <Button
                size="icon"
                variant={showFavoritesOnly ? "default" : "outline"}
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className="relative"
              >
                <Heart className={`w-4 h-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
              </Button>
            )}
            <Button
              size="icon"
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="relative"
            >
              <Filter className="w-4 h-4" />
              {(selectedLotTypes.length > 0 || selectedCarparkTypes.length > 0 || selectedPaymentMethods.length > 0 || showFavoritesOnly) && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-background" />
              )}
            </Button>
          </div>

          {searchLocation && (
            <div className="mb-3 p-2 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-green-900 dark:text-green-100 flex-1">
                  {searchLocation.address || `${searchLocation.lat.toFixed(4)}°, ${searchLocation.lng.toFixed(4)}°`}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs"
                  onClick={clearSearch}
                >
                  Clear
                </Button>
              </div>
            </div>
          )}

          {showFilters && (
            <div className="space-y-6 p-4 bg-gradient-to-br from-background to-muted/50 rounded-xl border shadow-sm">
              {/* Filters */}
              <div className="space-y-4">
                {/* Lot Type Filter - Premium Only */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                      Lot Type
                      {!isPremium && <Badge variant="secondary" className="text-xs">Premium</Badge>}
                    </label>
                    {selectedLotTypes.length !== 3 && isPremium && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setSelectedLotTypes(['C', 'Y', 'H'])}
                      >
                        Select All
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    {uniqueLotTypes.map((lotType) => (
                      <div key={lotType} className="flex items-center space-x-2 p-1 rounded hover:bg-muted/30">
                        <Checkbox
                          id={`lot-${lotType}`}
                          checked={selectedLotTypes.includes(lotType)}
                          onCheckedChange={() => {
                            if (!isPremium) {
                              onViewChange('pricing');
                              return;
                            }
                            toggleLotType(lotType);
                          }}
                        />
                        <Label
                          htmlFor={`lot-${lotType}`}
                          className="text-xs cursor-pointer flex-1"
                        >
                          {getLotTypeLabel(lotType)}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Carpark Type Filter */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Carpark Type
                    </label>
                    {selectedCarparkTypes.length > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setSelectedCarparkTypes([])}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-1 max-h-32 overflow-y-auto">
                    {uniqueCarparkTypes.map((carparkType) => (
                      <div key={carparkType} className="flex items-center space-x-2 p-1 rounded hover:bg-muted/30">
                        <Checkbox
                          id={`carpark-${carparkType}`}
                          checked={selectedCarparkTypes.includes(carparkType)}
                          onCheckedChange={() => toggleCarparkType(carparkType)}
                        />
                        <Label
                          htmlFor={`carpark-${carparkType}`}
                          className="text-xs cursor-pointer flex-1"
                        >
                          {formatCarparkType(carparkType)}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>


                {/* Payment Method Filter */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Payment Method
                    </label>
                    {selectedPaymentMethods.length > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setSelectedPaymentMethods([])}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-1 max-h-32 overflow-y-auto">
                    {uniquePaymentMethods.map((paymentMethod) => (
                      <div key={paymentMethod} className="flex items-center space-x-2 p-1 rounded hover:bg-muted/30">
                        <Checkbox
                          id={`payment-${paymentMethod}`}
                          checked={selectedPaymentMethods.includes(paymentMethod)}
                          onCheckedChange={() => togglePaymentMethod(paymentMethod)}
                        />
                        <Label
                          htmlFor={`payment-${paymentMethod}`}
                          className="text-xs cursor-pointer flex-1"
                        >
                          {paymentMethod}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Clear All Filters Button */}
              {(selectedLotTypes.length !== 3 || selectedCarparkTypes.length > 0 || selectedPaymentMethods.length > 0 || showFavoritesOnly) && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full bg-destructive/5 hover:bg-destructive/10 text-destructive border-destructive/20"
                  onClick={clearAllFilters}
                >
                  Clear All Filters
                </Button>
              )}
            </div>
          )}

          {userLocation ? (
            <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 text-sm">
                <Locate className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-blue-900 dark:text-blue-100">
                  Location: {userLocation.lat.toFixed(4)}°,{" "}
                  {userLocation.lng.toFixed(4)}°
                </span>

              </div>

            </div>
          ) : (
            <div className="mt-3 p-2 bg-muted rounded-lg border border-border">
              <div className="flex items-center gap-2 text-sm">
                <Locate className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Showing Singapore area
                </span>
                {isLoadingLocation && (
                  <span className="ml-auto text-xs text-blue-600">
                    Getting location...
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Scrollable carpark list section */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-4"
          onScroll={handleScroll}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3>
                {searchLocation
                  ? `Within ${searchRadius[0]}km`
                  : searchQuery && !isPostalCode(searchQuery)
                    ? `Search Results`
                    : `In View`
                }
              </h3>
              {(selectedLotTypes.length > 0 || selectedCarparkTypes.length > 0 || selectedPaymentMethods.length > 0) && (
                <Badge variant="secondary" className="text-xs">
                  {selectedLotTypes.length + selectedCarparkTypes.length + selectedPaymentMethods.length} filter{selectedLotTypes.length + selectedCarparkTypes.length + selectedPaymentMethods.length > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isLoadingCarparks && (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={handleRefresh}
                disabled={isLoadingCarparks}
                title="Refresh availability data"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingCarparks ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {carparksInBounds
              .slice(0, visibleCount)
              .map((carpark, index) => (
                <div key={`carpark-${carpark.id}`}>
                  {/* Show ad every 4th item for free users */}
                  {!isPremium && index > 0 && index % 4 === 0 && (
                    <AdPlaceholder size="small" className="mb-3" />
                  )}
                  <Card

                    className={`cursor-pointer transition-all ${selectedCarpark === carpark.id
                      ? "ring-2 ring-primary"
                      : "hover:shadow-md"
                      }`}
                    onClick={() => handleCarparkClick(carpark)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-sm flex-1">
                          {getCarparkDisplayName(carpark)}
                        </CardTitle>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => handleToggleFavorite(carpark.id, e)}
                          >
                            <Heart
                              className={`w-4 h-4 ${user?.favoriteCarparks?.includes(carpark.id) ? 'fill-red-500 text-red-500' : ''}`}
                            />
                          </Button>
                          <Badge
                            variant="outline"
                            className="text-xs"
                          >
                            {carpark.distance !== undefined
                              ? `${carpark.distance}km`
                              : "-"}
                          </Badge>
                        </div>
                      </div>

                      {carpark.car_park_type && (
                        <div className="mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {formatCarparkType(carpark.car_park_type)}
                          </Badge>
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="space-y-2">
                          {/* Lot Types Row */}
                          <LotDetailsDisplay carpark={carpark} size="sm" />

                          {/* EV Row */}
                          {carpark.evLots > 0 && (
                            <div className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                              <Zap className="w-3 h-3" />
                              <span>{carpark.evLots} EV</span>
                            </div>
                          )}
                        </div>
                        <div
                          className={`w-2 h-2 rounded-full ${(() => {
                            // Use car lots (Type C) for marker color logic
                            const carLot = carpark.lotDetails?.find(lot => lot.lot_type === 'C');
                            if (carLot) {
                              return getAvailabilityBgColor(carLot.available_lots, carLot.total_lots || null);
                            }
                            // Fallback to overall availability
                            return getAvailabilityBgColor(getCarparkAvailableLots(carpark), getCarparkTotalLots(carpark));
                          })()}`}
                        />

                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>
                            {carpark.drivingTime !== undefined
                              ? `${carpark.drivingTime} min drive`
                              : "- min drive"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          <span>S${carpark.rates.hourly}/30min</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}

            {/* Loading indicator for infinite scroll */}
            {visibleCount < carparksInBounds.length && (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* End message */}
            {visibleCount >= carparksInBounds.length &&
              carparksInBounds.length > 5 && (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  All carparks in view loaded
                </div>
              )}

            {/* No carparks message */}
            {carparksInBounds.length === 0 &&
              !isLoadingCarparks && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  {searchLocation
                    ? `No carparks found within ${searchRadius[0]}km. Try increasing the search radius.`
                    : searchQuery && !isPostalCode(searchQuery)
                      ? 'No carparks match your search. Try a different location or address.'
                      : 'No carparks in current view. Try zooming out or moving the map.'
                  }
                </div>
              )}
          </div>
        </div>
      </div>

      {/* Mobile Backdrop Overlay */}
      {isSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/30 z-[9] transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
          aria-label="Close sidebar"
        />
      )}

      {/* Sidebar Toggle Button - Mobile */}
      <Button
        variant="default"
        size="icon"
        className={`
          md:hidden absolute z-20 top-4 transition-all duration-300
          ${isSidebarOpen ? 'left-[304px]' : 'left-4'}
        `}
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        {isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </Button>

      {/* Map Area - Fixed, non-scrollable */}
      <div className="flex-1 relative bg-gray-100 dark:bg-gray-900 overflow-hidden">
        {/* Floating Ad Placeholder for Free Users */}
        {!isPremium && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 z-30 hidden lg:block">
            <AdPlaceholder
              size="large"
              className="w-48 h-96 shadow-lg"
            />
          </div>
        )}

        <LeafletMap
          carparks={carparksForMap}
          userLocation={userLocation}
          selectedCarparkId={selectedCarpark}
          onCarparkClick={handleCarparkClick}
          onBoundsChange={handleBoundsChange}
          onZoomChange={undefined}
          searchLocation={searchLocation}
          selectedLotTypes={selectedLotTypes}
        />

        {!isPremium && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20">
            <Card className="max-w-sm">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  🎯 Want smarter recommendations?
                </p>
                <Button
                  size="sm"
                  onClick={() => onViewChange("pricing")}
                  className="w-full"
                >
                  Upgrade to Premium
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Map Controls */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          {/* Location status indicator */}
          <div
            className={`p-2 rounded-md bg-white border ${userLocation
              ? 'border-green-200 text-green-600'
              : isLoadingLocation
                ? 'border-blue-200 text-blue-600'
                : 'border-gray-200 text-gray-400'
              }`}
            title={
              userLocation
                ? 'Location enabled'
                : isLoadingLocation
                  ? 'Getting location...'
                  : 'Location unavailable'
            }
          >
            <Locate
              className={`w-4 h-4 ${isLoadingLocation ? "animate-spin" : ""}`}
            />
          </div>
          <Button
            size="icon"
            variant="outline"
            className="bg-white"
            title="Navigate"
          >
            <Navigation className="w-4 h-4" />
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex gap-2 justify-center">
            <Button
              variant="outline"
              className="bg-white"
              onClick={() => onViewChange("search")}
            >
              Advanced Search
            </Button>
            {isPremium && (
              <Button
                variant="outline"
                className="bg-white"
                onClick={() => onViewChange("premium")}
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