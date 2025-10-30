import { 
  ArrowLeft, 
  Navigation, 
  Car, 
  Clock, 
  DollarSign, 
  MapPin, 
  Star,
  Heart,
  BarChart3
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { PredictionChart } from './ui/PredictionChart';
import { PredictionInsights } from './ui/PredictionInsights';
import { Carpark, User } from '../types';
import { toast } from "sonner";
import { AuthService } from '../services/authService';
import { getCarparkDisplayName } from '../utils/carpark';
import { usePredictions } from '../hooks/usePredictions';
import { calculateDistance } from '../utils/distance';
import { memo, useCallback, useMemo, useEffect, useState, useRef } from 'react';


interface CarparkDetailsProps {
  carpark: Carpark;
  onBack: () => void;
  onViewChange: (view: string) => void;
  isPremium: boolean;
  user?: User;
  onUpdateUser?: (user: User) => void;
}

export const CarparkDetails = memo(function CarparkDetails({ carpark, onBack, onViewChange, isPremium, user, onUpdateUser }: CarparkDetailsProps) {
  // State for user location and calculated values
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [calculatedDistance, setCalculatedDistance] = useState<number | undefined>(carpark.distance);
  const [calculatedDrivingTime, setCalculatedDrivingTime] = useState<number | undefined>(carpark.drivingTime);

  // Ref to track last fetched carpark to prevent infinite loops
  const lastFetchedCarparkRef = useRef<string | null>(null);

  // Prediction hook
  const predictions = usePredictions({
    retryAttempts: 2,
    retryDelay: 1000,
    staleThreshold: 30, // 30 minutes
  });

  // Get user location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(location);
        },
        (error) => {
          console.warn('Could not get user location:', error);
          // Use default Singapore location as fallback
          setUserLocation({ lat: 1.3521, lng: 103.8198 });
        },
        { timeout: 10000, enableHighAccuracy: false }
      );
    } else {
      // Use default Singapore location as fallback
      setUserLocation({ lat: 1.3521, lng: 103.8198 });
    }
  }, []);

  // Calculate distance and driving time when user location is available
  useEffect(() => {
    if (userLocation) {
      const distance = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        carpark.coordinates.lat,
        carpark.coordinates.lng
      );
      
      // Estimate driving time (assuming average speed of 30 km/h in Singapore)
      const estimatedDrivingTime = Math.round((distance / 30) * 60); // Convert to minutes
      
      setCalculatedDistance(distance);
      setCalculatedDrivingTime(estimatedDrivingTime);
    }
  }, [userLocation, carpark.coordinates]);

  // Auto-load predictions for premium users
  useEffect(() => {
    if (isPremium && lastFetchedCarparkRef.current !== carpark.id) {
      lastFetchedCarparkRef.current = carpark.id;
      predictions.fetchPredictions(carpark.id, carpark.totalLots ?? undefined);
    } else if (!isPremium) {
      // Reset ref when user is not premium
      lastFetchedCarparkRef.current = null;
    }
  }, [isPremium, carpark.id, carpark.totalLots, predictions.fetchPredictions]);

  // Memoize expensive calculations
  const availabilityStatus = useMemo(() => {
    const getAvailabilityStatus = (available: number, total: number | null) => {
      if (total === null || total === 0) {
        return { text: 'Unknown', color: 'bg-gray-100 text-gray-800' };
      }
      const percentage = (available / total) * 100;
      if (percentage > 30) return { text: 'Good Availability', color: 'bg-green-100 text-green-800' };
      if (percentage > 10) return { text: 'Limited Availability', color: 'bg-yellow-100 text-yellow-800' };
      return { text: 'Very Limited', color: 'bg-red-100 text-red-800' };
    };
    return getAvailabilityStatus(carpark.availableLots, carpark.totalLots);
  }, [carpark.availableLots, carpark.totalLots]);
  
  const isFavorite = useMemo(() => 
    user?.favoriteCarparks?.includes(carpark.id) || false, 
    [user?.favoriteCarparks, carpark.id]
  );

  const displayName = useMemo(() => 
    getCarparkDisplayName(carpark), 
    [carpark]
  );
  
  const handleToggleFavorite = useCallback(async () => {
    if (!user || !onUpdateUser) {
      toast.error('Please sign up to save favorites');
      onViewChange('login');
      return;
    }
    
    const currentFavorites = user.favoriteCarparks || [];
    const updatedFavorites = isFavorite
      ? currentFavorites.filter(id => id !== carpark.id)
      : [...currentFavorites, carpark.id];
    
    // Optimistically update UI
    onUpdateUser({
      ...user,
      favoriteCarparks: updatedFavorites,
    });
    
    // Call API to update favorites
    const response = await AuthService.toggleFavoriteCarpark(user, carpark.id);
    
    if (response.user) {
      onUpdateUser(response.user);
      toast.success(response.action === 'added' ? 'Added to favorites' : 'Removed from favorites');
    } else {
      // Revert on failure
      onUpdateUser(user);
      toast.error(response.error || 'Failed to update favorites');
    }
  }, [user, onUpdateUser, onViewChange, carpark.id, isFavorite]);

  const handleOpenMaps = useCallback(() => {
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const mapsUrl = isIOS
      ? `maps://maps.apple.com/?daddr=${carpark.coordinates.lat},${carpark.coordinates.lng}&dirflg=d`
      : `https://www.google.com/maps/dir/?api=1&destination=${carpark.coordinates.lat},${carpark.coordinates.lng}`;
    window.open(mapsUrl, '_blank');
  }, [carpark.coordinates.lat, carpark.coordinates.lng]);

  const handlePremiumAction = useCallback((action: string) => {
    onViewChange(action);
  }, [onViewChange]);



  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto p-3 sm:p-4 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3 flex-1">
          <Button variant="outline" size="icon" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl break-words">{displayName}</h1>

          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant={isFavorite ? 'default' : 'outline'}
            size="icon"
            onClick={handleToggleFavorite}
            className={isFavorite ? 'bg-red-500 hover:bg-red-600' : ''}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
          </Button>
          <Badge className={availabilityStatus.color}>
            {availabilityStatus.text}
          </Badge>
        </div>
      </div>

      <div className={`grid gap-6 ${isPremium ? 'grid-cols-1 xl:grid-cols-5' : 'grid-cols-1 lg:grid-cols-3'}`}>
        {/* Main Info */}
        <div className={isPremium ? 'xl:col-span-3 space-y-4' : 'lg:col-span-2 space-y-4'}>
          {/* Availability */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="w-5 h-5" />
                Live Availability
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl mb-1">{carpark.availableLots}</div>
                  <div className="text-sm text-muted-foreground">Regular Lots Available</div>
                  <div className="text-xs text-muted-foreground">of {carpark.totalLots !== null ? carpark.totalLots : 'N/A'} total</div>
                </div>
                {carpark.evLots > 0 && (
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl mb-1 text-blue-600">{carpark.evLots}</div>
                    <div className="text-sm text-blue-600">EV Charging Lots</div>
                    <div className="text-xs text-muted-foreground">Available for use</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Rates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Parking Rates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Per 30 Minutes</span>
                  <span>S${carpark.rates.hourly.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Daily Cap</span>
                  <span>S${carpark.rates.daily.toFixed(2)}</span>
                </div>
                {carpark.evLots > 0 && (
                  <div className="flex justify-between">
                    <span>EV Charging (per kWh)</span>
                    <span>S${carpark.rates.evCharging.toFixed(2)}</span>
                  </div>
                )}
              </div>
              
              {isPremium && (
                <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                  <h4 className="flex items-center gap-2 mb-2">
                    <Star className="w-4 h-4 text-yellow-600" />
                    Premium Calculator
                  </h4>
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={() => handlePremiumAction('premium')}
                  >
                    Calculate Total Cost
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Features */}
          <Card>
            <CardHeader>
              <CardTitle>Features & Amenities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Badge variant="default">
                  {carpark.type}
                </Badge>
                {carpark.features.map((feature) => (
                  <Badge key={feature} variant="outline">
                    {feature}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Operating Hours & Payment */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4" />
                <div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Type: </span>
                    <span>{carpark.car_park_type || 'N/A'}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">System: </span>
                    <span>{carpark.type_of_parking_system || 'N/A'}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4" />
                <div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Lot Type: </span>
                    <span>{carpark.lot_type || 'N/A'}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Operating Hours: {carpark.operatingHours}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar - Predictions for Premium, Actions for Free */}
        <div className={`space-y-4 ${isPremium ? 'xl:col-span-2' : ''}`}>
          {isPremium ? (
            /* Premium: Show Predictions */
            <>
              {/* Navigation - Compact */}
              <Card>
                <CardContent className="p-4">
                  <Button 
                    className="w-full" 
                    onClick={handleOpenMaps}
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    Open in Maps
                  </Button>
                  <div className="text-sm text-muted-foreground text-center mt-2">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {calculatedDrivingTime !== undefined ? `${calculatedDrivingTime} min drive` : '- min drive'} • {calculatedDistance !== undefined ? `${calculatedDistance.toFixed(1)}km` : '-'} away
                  </div>
                </CardContent>
              </Card>

              {/* Smart Insights */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Smart Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {predictions.data && predictions.data.predictions.length > 0 ? (
                    <div className="space-y-4">
                      {/* Compact Chart */}
                      <PredictionChart
                        predictions={predictions.data.predictions}
                        carparkName={displayName}
                        totalLots={carpark.totalLots ?? undefined}
                        loading={predictions.loading}
                        error={predictions.error ?? undefined}
                        onRetry={predictions.retry}
                        showInsights={false}
                        chartType="bar"
                        compact={true}
                      />
                      
                      {/* Simplified Insights */}
                      <PredictionInsights
                        predictions={predictions.data.predictions}
                        carparkInfo={{
                          name: displayName,
                          totalLots: carpark.totalLots ?? 0,
                        }}
                        analysis={predictions.data.analysis}
                      />
                    </div>
                  ) : predictions.loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                      <p className="ml-2 text-sm text-muted-foreground">Loading insights...</p>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <BarChart3 className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {predictions.error ? 'Unable to load insights' : 'No insights available'}
                      </p>
                      {predictions.error && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={predictions.retry}
                          className="mt-2"
                        >
                          Retry
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Premium Actions - Compact */}
                  <div className="mt-4 space-y-2">
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      className="w-full"
                    >
                      Join Waitlist
                    </Button>
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      className="w-full"
                    >
                      Set Availability Alert
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            /* Free Users: Original Actions Sidebar */
            <>
              {/* Navigation */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Navigation className="w-5 h-5" />
                    Navigate
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button 
                    className="w-full" 
                    onClick={handleOpenMaps}
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    Open in Maps
                  </Button>
                  <div className="text-sm text-muted-foreground text-center">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {calculatedDrivingTime !== undefined ? `${calculatedDrivingTime} min drive` : '- min drive'} • {calculatedDistance !== undefined ? `${calculatedDistance.toFixed(1)}km` : '-'} away
                  </div>
                </CardContent>
              </Card>

              {/* Premium Features Upsell */}
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="p-4">
                  <h4 className="mb-2">🚀 Premium Features</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground mb-3">
                    <li>• 24-Hour availability forecast</li>
                    <li>• Cost calculator</li>
                    <li>• Waitlist notifications</li>
                    <li>• Smart recommendations</li>
                  </ul>
                  <Button 
                    size="sm" 
                    className="w-full"
                    onClick={() => handlePremiumAction('pricing')}
                  >
                    Upgrade to Premium
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
      </div>
    </div>
  );
});