import {
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";
import {
  MapPin,
  Navigation,
  Car,
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
import { Slider } from "./ui/slider";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { Carpark, User } from "../types";
import { LeafletMap } from "./LeafletMap";
import { useDrivingTimes } from "../hooks/useDrivingTimes";
import { useCarparks } from "../hooks/useCarparks";
import { getCarparkDisplayName } from "../utils/carpark";
import { isPostalCode } from "../utils/postalCode";
import { geocodePostalCode, geocodeSearch } from "../services/geocodingService";
import { calculateDistance } from "../utils/distance";
import { toast } from "sonner";
import { updateFavoriteCarparks } from "../services/updateProfileService";

const MAX_MAP_CARPARKS = 30;
const LOW_ZOOM_THRESHOLD = 13; // Below this = zoomed out, above = zoomed in
const HIGH_AVAILABILITY_THRESHOLD = 0.3; // 30% availability

interface MapViewProps {
  onViewChange: (view: string) => void;
  onSelectCarpark: (carpark: Carpark) => void;
  isPremium: boolean;
  user?: User;
  onUpdateUser?: (user: User) => void;
}

export function MapView({
  onViewChange,
  onSelectCarpark,
  isPremium,
  user,
  onUpdateUser,
}: MapViewProps) {
  const [searchRadius, setSearchRadius] = useState([5]);
  const [selectedCarpark, setSelectedCarpark] = useState<
    string | null
  >(null);
  const [showFilters, setShowFilters] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] =
    useState(false);
  const [visibleCount, setVisibleCount] = useState(5);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [mapBounds, setMapBounds] = useState<{
    north: number;
    south: number;
    east: number;
    west: number;
  } | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(13);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchLocation, setSearchLocation] = useState<{
    lat: number;
    lng: number;
    address?: string;
  } | null>(null);
  const [selectedLotTypes, setSelectedLotTypes] = useState<string[]>([]);
  const [selectedCarparkTypes, setSelectedCarparkTypes] = useState<string[]>([]);
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<string[]>([]);

  // Fetch carparks from the API
  const { carparks: apiCarparks, loading: isLoadingCarparks, refetch: refetchCarparks } =
    useCarparks();

  // Use the driving times hook to get carparks with real or estimated driving times
  const {
    carparks: carparksWithDistance,
    isLoading: isLoadingDrivingTimes,
  } = useDrivingTimes({
    carparks: apiCarparks,
    userLocation,
    enableRealTimes: true, // Set to true to use OSRM API
  });

  const getUserLocation = () => {
    if (!navigator.geolocation) {
      return;
    }

    setIsLoadingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsLoadingLocation(false);
      },
      (error) => {
        console.log(
          "Location access denied or unavailable:",
          error,
        );
        setIsLoadingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      },
    );
  };

  // Handle manual refresh
  const handleRefresh = async () => {
    await refetchCarparks();
    toast.success('Carpark data refreshed', {
      description: 'Availability data has been updated',
      duration: 2000,
    });
  };

  // Handle search
  const handleSearch = async () => {
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
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery("");
    setSearchLocation(null);
  };

  // Handle favorite toggle
  const handleToggleFavorite = async (carparkId: string, event?: React.MouseEvent) => {
    // Prevent card click when clicking heart
    if (event) {
      event.stopPropagation();
    }
    
    if (!user || !onUpdateUser) {
      toast.error('Please login to save favorites', {
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
    const response = await updateFavoriteCarparks({
      user_id: user.user_id,
      fav_carparks: updatedFavorites,
    });
    
    if (response.success) {
      toast.success(isFavorite ? 'Removed from favorites' : 'Added to favorites', {
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
  };

  // Get unique lot types and carpark types from carparks
  const uniqueLotTypes = Array.from(
    new Set(
      carparksWithDistance
        .map((cp) => cp.lot_type)
        .filter((type) => type && type.trim() !== "")
    )
  ).sort();

  const uniqueCarparkTypes = Array.from(
    new Set(
      carparksWithDistance
        .map((cp) => cp.car_park_type)
        .filter((type) => type && type.trim() !== "")
    )
  ).sort();

  const uniquePaymentMethods = Array.from(
    new Set(
      carparksWithDistance
        .flatMap((cp) => cp.paymentMethods)
        .filter((method) => method && method.trim() !== "")
    )
  ).sort();

  // Format lot type for display
  const formatLotType = (lotType: string): string => {
    const lotTypeMap: Record<string, string> = {
      'C': 'Car',
      'Y': 'Motorcycle',
      'H': 'Heavy Vehicle',
    };
    return lotTypeMap[lotType] || lotType;
  };

  // Format carpark type for display (title case)
  const formatCarparkType = (carparkType: string): string => {
    return carparkType
      .split(' ')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };

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
    setSelectedLotTypes([]);
    setSelectedCarparkTypes([]);
    setSelectedPaymentMethods([]);
    setSearchRadius([5]);
  };

  // Filter carparks by search query or map bounds
  const carparksInBounds = (() => {
    let filtered = carparksWithDistance;

    // If there's a search location (postal code or address search)
    if (searchLocation) {
      // Filter by distance from search location
      const radius = searchRadius[0]; // in km
      filtered = carparksWithDistance
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
      filtered = carparksWithDistance.filter((carpark) => {
        const address = (carpark.address || '').toLowerCase();
        const name = (carpark.name || '').toLowerCase();
        return address.includes(query) || name.includes(query);
      });
    }
    // Default: filter by map bounds
    else if (mapBounds) {
      filtered = carparksWithDistance.filter((carpark) => {
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
      filtered = filtered.filter((carpark) => 
        selectedLotTypes.includes(carpark.lot_type)
      );
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

    return filtered;
  })();

  /**
   * Smart carpark filtering for map display
   * 1. Filters by viewport bounds
   * 2. Calculates distance from map center for each carpark
   * 3. Sorts by distance from center (closest to center first)
   * 4. Limits to MAX_MAP_CARPARKS
   */
  const getCarparksForMap = useCallback((): Carpark[] => {
    if (!mapBounds) return [];
    
    // Calculate map center
    const centerLat = (mapBounds.north + mapBounds.south) / 2;
    const centerLng = (mapBounds.east + mapBounds.west) / 2;

    // Calculate distance from center for each carpark in bounds
    const carparksWithCenterDistance = carparksInBounds.map((carpark) => {
      // Use Haversine formula to calculate distance from map center
      const R = 6371; // Earth's radius in km
      const dLat = ((carpark.latitude - centerLat) * Math.PI) / 180;
      const dLng = ((carpark.longitude - centerLng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((centerLat * Math.PI) / 180) *
          Math.cos((carpark.latitude * Math.PI) / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distanceFromCenter = R * c;

      return {
        ...carpark,
        distanceFromCenter,
      };
    });

    // Sort by distance from center (closest first)
    carparksWithCenterDistance.sort(
      (a, b) => a.distanceFromCenter - b.distanceFromCenter
    );

    // Limit to MAX_MAP_CARPARKS
    return carparksWithCenterDistance.slice(0, MAX_MAP_CARPARKS);
  }, [carparksInBounds, mapBounds]);

  const carparksForMap = getCarparksForMap();
  const hasMoreCarparks =
    carparksInBounds.length > carparksForMap.length;

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

  // Handle zoom change
  const handleZoomChange = useCallback((zoom: number) => {
    setCurrentZoom(zoom);
  }, []);

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

  const getAvailabilityColor = (
    available: number,
    total: number | null,
  ) => {
    if (total === null || total === 0) return "bg-gray-400";
    const percentage = (available / total) * 100;
    if (percentage > 30) return "bg-green-500";
    if (percentage > 10) return "bg-yellow-500";
    return "bg-red-500";
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
            <Button
              size="icon"
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="relative"
            >
              <Filter className="w-4 h-4" />
              {(selectedLotTypes.length > 0 || selectedCarparkTypes.length > 0 || selectedPaymentMethods.length > 0) && (
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
            <div className="space-y-4 p-3 bg-muted rounded-lg">
              {/* Search Radius */}
              <div>
                <label className="text-sm mb-2 block">
                  Search Radius: {searchRadius[0]}km
                </label>
                <Slider
                  value={searchRadius}
                  onValueChange={setSearchRadius}
                  max={10}
                  min={1}
                  step={0.5}
                  className="w-full"
                />
              </div>

              {/* Lot Type Filter */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm">
                    Lot Type
                  </label>
                  {selectedLotTypes.length > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-auto p-0 text-xs"
                      onClick={() => setSelectedLotTypes([])}
                    >
                      Clear
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  {uniqueLotTypes.map((lotType) => (
                    <div key={lotType} className="flex items-center space-x-2">
                      <Checkbox
                        id={`lot-${lotType}`}
                        checked={selectedLotTypes.includes(lotType)}
                        onCheckedChange={() => toggleLotType(lotType)}
                      />
                      <Label
                        htmlFor={`lot-${lotType}`}
                        className="text-sm cursor-pointer"
                      >
                        {formatLotType(lotType)}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Carpark Type Filter */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm">
                    Carpark Type
                  </label>
                  {selectedCarparkTypes.length > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-auto p-0 text-xs"
                      onClick={() => setSelectedCarparkTypes([])}
                    >
                      Clear
                    </Button>
                  )}
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {uniqueCarparkTypes.map((carparkType) => (
                    <div key={carparkType} className="flex items-center space-x-2">
                      <Checkbox
                        id={`carpark-${carparkType}`}
                        checked={selectedCarparkTypes.includes(carparkType)}
                        onCheckedChange={() => toggleCarparkType(carparkType)}
                      />
                      <Label
                        htmlFor={`carpark-${carparkType}`}
                        className="text-sm cursor-pointer"
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
                  <label className="text-sm">
                    Payment Method
                  </label>
                  {selectedPaymentMethods.length > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-auto p-0 text-xs"
                      onClick={() => setSelectedPaymentMethods([])}
                    >
                      Clear
                    </Button>
                  )}
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {uniquePaymentMethods.map((paymentMethod) => (
                    <div key={paymentMethod} className="flex items-center space-x-2">
                      <Checkbox
                        id={`payment-${paymentMethod}`}
                        checked={selectedPaymentMethods.includes(paymentMethod)}
                        onCheckedChange={() => togglePaymentMethod(paymentMethod)}
                      />
                      <Label
                        htmlFor={`payment-${paymentMethod}`}
                        className="text-sm cursor-pointer"
                      >
                        {paymentMethod}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Clear All Filters Button */}
              {(selectedLotTypes.length > 0 || selectedCarparkTypes.length > 0 || selectedPaymentMethods.length > 0 || searchRadius[0] !== 5) && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
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
                {isLoadingDrivingTimes && (
                  <Loader2 className="w-3 h-3 animate-spin text-blue-600 dark:text-blue-400" />
                )}
              </div>
            </div>
          ) : (
            <div className="mt-3 p-2 bg-muted rounded-lg border border-border">
              <div className="flex items-center gap-2 text-sm">
                <Locate className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Showing Singapore area
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto h-6 px-2 text-xs"
                  onClick={getUserLocation}
                  disabled={isLoadingLocation}
                >
                  {isLoadingLocation
                    ? "Getting..."
                    : "Use My Location"}
                </Button>
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
                  ? `Within ${searchRadius[0]}km (${carparksInBounds.length})`
                  : searchQuery && !isPostalCode(searchQuery)
                  ? `Search Results (${carparksInBounds.length})`
                  : `In View (${carparksInBounds.length})`
                }
              </h3>
              {(selectedLotTypes.length > 0 || selectedCarparkTypes.length > 0 || selectedPaymentMethods.length > 0) && (
                <Badge variant="secondary" className="text-xs">
                  {selectedLotTypes.length + selectedCarparkTypes.length + selectedPaymentMethods.length} filter{selectedLotTypes.length + selectedCarparkTypes.length + selectedPaymentMethods.length > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {(isLoadingCarparks || isLoadingDrivingTimes) && (
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
              .map((carpark) => (
                <Card
                  key={carpark.id}
                  className={`cursor-pointer transition-all ${
                    selectedCarpark === carpark.id
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
                    {carpark.name && carpark.name.trim() !== '' && (
                      <p className="text-xs text-muted-foreground">
                        {carpark.address}
                      </p>
                    )}
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
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <Car className="w-3 h-3" />
                          <span className="text-sm">
                            {carpark.availableLots}/
                            {carpark.totalLots !== null ? carpark.totalLots : 'N/A'}
                          </span>
                        </div>
                        <div
                          className={`w-2 h-2 rounded-full ${getAvailabilityColor(carpark.availableLots, carpark.totalLots)}`}
                        />
                      </div>
                      {carpark.evLots > 0 && (
                        <div className="flex items-center gap-1">
                          <Zap className="w-3 h-3 text-blue-600" />
                          <span className="text-sm text-blue-600">
                            {carpark.evLots} EV
                          </span>
                        </div>
                      )}
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
        <LeafletMap
          carparks={carparksForMap}
          userLocation={userLocation}
          selectedCarparkId={selectedCarpark}
          onCarparkClick={handleCarparkClick}
          onBoundsChange={handleBoundsChange}
          onZoomChange={handleZoomChange}
          searchLocation={searchLocation}
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
          <Button
            size="icon"
            variant="outline"
            className="bg-white"
            onClick={getUserLocation}
            title="Get my location"
            disabled={isLoadingLocation}
          >
            <Locate
              className={`w-4 h-4 ${isLoadingLocation ? "animate-spin" : ""}`}
            />
          </Button>
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