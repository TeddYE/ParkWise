import {
  ArrowLeft,
  Navigation,
  Car,
  Motorbike,
  Truck,
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
import { Slider } from './ui/slider';
import { PredictionChart } from './ui/PredictionChart';
import { PredictionInsights } from './ui/PredictionInsights';
import { AdPlaceholder } from './ui/AdPlaceholder';
import { Carpark, User, getCarparkTotalLots, getCarparkAvailableLots, getCarparkPrimaryLotType } from '../types';
import { toast } from "sonner";
import { AuthService } from '../services/authService';
import { getCarparkDisplayName } from '../utils/carpark';
import { usePredictions } from '../hooks/usePredictions';

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
  // Use carpark's distance and driving time directly (calculated by shared hook)
  const distance = carpark.distance;
  const drivingTime = carpark.drivingTime;

  // Ref to track last fetched carpark to prevent infinite loops
  const lastFetchedCarparkRef = useRef<string | null>(null);

  // Calculator state
  const [calculatorHours, setCalculatorHours] = useState<number>(1);
  const [calculatedCost, setCalculatedCost] = useState<number | null>(null);

  // Prediction hook
  const predictions = usePredictions({
    retryAttempts: 2,
    retryDelay: 1000,
    staleThreshold: 30, // 30 minutes
  });





  // Auto-load predictions for premium users
  useEffect(() => {
    if (isPremium && lastFetchedCarparkRef.current !== carpark.id) {
      lastFetchedCarparkRef.current = carpark.id;
      predictions.fetchPredictions(carpark.id, getCarparkTotalLots(carpark) || undefined);
    } else if (!isPremium) {
      // Reset ref when user is not premium
      lastFetchedCarparkRef.current = null;
    }
  }, [isPremium, carpark.id, carpark, predictions.fetchPredictions]);

  // Memoize expensive calculations
  const availabilityStatus = useMemo(() => {
    const getAvailabilityStatus = (available: number) => {
      // Since totals are now N/A, use absolute availability numbers for status
      if (available > 50) return { text: 'Good Availability', color: 'bg-green-100 text-green-800' };
      if (available > 20) return { text: 'Limited Availability', color: 'bg-yellow-100 text-yellow-800' };
      if (available > 0) return { text: 'Very Limited', color: 'bg-orange-100 text-orange-800' };
      return { text: 'No Availability', color: 'bg-red-100 text-red-800' };
    };
    return getAvailabilityStatus(carpark.availableLots);
  }, [carpark.availableLots]);

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

  const calculateParkingCost = useCallback((hours: number) => {
    // carpark.rates.hourly is the actual per-hour rate
    const hourlyRate = carpark.rates.hourly;
    const dailyCap = carpark.rates.daily;

    // Calculate cost based on hours
    const totalCost = hours * hourlyRate;

    // Apply daily cap if cost exceeds it
    const finalCost = Math.min(totalCost, dailyCap);

    return finalCost;
  }, [carpark.rates]);

  const handleCalculatorChange = useCallback((value: number[]) => {
    const hours = value[0];
    setCalculatorHours(hours);

    if (hours > 0) {
      const cost = calculateParkingCost(hours);
      setCalculatedCost(cost);
    } else {
      setCalculatedCost(null);
    }
  }, [calculateParkingCost]);

  // Initialize calculator with default value
  useEffect(() => {
    const cost = calculateParkingCost(1);
    setCalculatedCost(cost);
  }, [calculateParkingCost]);



  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto p-3 sm:p-4 space-y-4 sm:space-y-6">
        {/* Ad Banner for Free Users */}
        {!isPremium && (
          <AdPlaceholder size="small" />
        )}

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
            <div className="relative">
              <Button
                variant={isFavorite ? 'default' : 'outline'}
                size="icon"
                onClick={handleToggleFavorite}
                className={isFavorite ? 'bg-red-500 hover:bg-red-600' : ''}
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
              </Button>

            </div>
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
                <div className="space-y-4">
                  {/* Lot Type Breakdown */}
                  {carpark.lotDetails && carpark.lotDetails.length > 0 && (
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-muted-foreground">Breakdown by Lot Type:</div>
                      <div className="grid grid-cols-3 gap-3">
                        {carpark.lotDetails.filter(lot => ['C', 'Y', 'H'].includes(lot.lot_type) && lot.total_lots && lot.total_lots > 0).map((lot) => {
                          const getLotIcon = (lotType: string) => {
                            switch (lotType) {
                              case 'C': return <Car className="w-6 h-6" />;
                              case 'Y': return <Motorbike className="w-6 h-6" />;
                              case 'H': return <Truck className="w-6 h-6" />;
                              default: return <Car className="w-6 h-6" />;
                            }
                          };

                          const getLotColor = (lotType: string) => {
                            switch (lotType) {
                              case 'C': return 'text-blue-600';
                              case 'Y': return 'text-green-600';
                              case 'H': return 'text-orange-600';
                              default: return 'text-blue-600';
                            }
                          };

                          const getLotBgColor = (lotType: string) => {
                            switch (lotType) {
                              case 'C': return 'bg-blue-50';
                              case 'Y': return 'bg-green-50';
                              case 'H': return 'bg-orange-50';
                              default: return 'bg-blue-50';
                            }
                          };

                          const getLotName = (lotType: string) => {
                            switch (lotType) {
                              case 'C': return 'Car Lots';
                              case 'Y': return 'Motorcycle Lots';
                              case 'H': return 'Heavy Vehicle Lots';
                              default: return 'Lots';
                            }
                          };

                          return (
                            <div key={lot.lot_type} className={`text-center p-4 ${getLotBgColor(lot.lot_type)} rounded-lg`}>
                              <div className={`flex justify-center mb-2 ${getLotColor(lot.lot_type)}`}>
                                {getLotIcon(lot.lot_type)}
                              </div>
                              <div className={`text-xl mb-1 font-semibold ${getLotColor(lot.lot_type)}`}>
                                {lot.available_lots}/{lot.total_lots !== undefined ? lot.total_lots : 'N/A'}
                              </div>
                              <div className={`text-sm ${getLotColor(lot.lot_type)}`}>
                                {getLotName(lot.lot_type)}
                              </div>
                              <div className="text-xs text-muted-foreground">available/total</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* EV Charging Section */}
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
                    <span>Per Hour</span>
                    <span>S${carpark.rates.hourly.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Daily Cap</span>
                    <span>S${carpark.rates.daily.toFixed(2)}</span>
                  </div>

                </div>

                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                  <h4 className="flex items-center gap-2 mb-3">
                    <Star className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    Cost Calculator
                  </h4>

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Duration</span>
                        <span className="text-sm font-medium">{calculatorHours} {calculatorHours === 1 ? 'hour' : 'hours'}</span>
                      </div>
                      <Slider
                        value={[calculatorHours]}
                        onValueChange={handleCalculatorChange}
                        max={24}
                        min={0.5}
                        step={0.5}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>30 min</span>
                        <span>24 hours</span>
                      </div>
                    </div>

                    {calculatedCost !== null && (
                      <div className="p-2 bg-background rounded border">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Total Cost:</span>
                          <span className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                            S${calculatedCost.toFixed(2)}
                          </span>
                        </div>
                        {calculatedCost >= carpark.rates.daily && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Daily cap applied
                          </div>
                        )}
                      </div>
                    )}


                  </div>
                </div>
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
                      {drivingTime !== undefined ? `${drivingTime} min drive` : '- min drive'} • {distance !== undefined ? `${distance.toFixed(1)}km` : '-'} away
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
                    <p className="text-sm text-muted-foreground">
                      Car lot availability predictions and recommendations
                    </p>
                  </CardHeader>
                  <CardContent>
                    {predictions.data && predictions.data.predictions.length > 0 ? (
                      <div className="space-y-4">
                        {/* Compact Chart */}
                        <PredictionChart
                          predictions={predictions.data.predictions}
                          carparkName={displayName}
                          totalLots={carpark.totalLots ?? undefined}
                          carpark={{
                            lotDetails: carpark.lotDetails,
                          }}
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
                          carpark={{
                            lotDetails: carpark.lotDetails,
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
                      {drivingTime !== undefined ? `${drivingTime} min drive` : '- min drive'} • {distance !== undefined ? `${distance.toFixed(1)}km` : '-'} away
                    </div>
                  </CardContent>
                </Card>

                {/* Premium Features Upsell */}
                <Card className="border-yellow-200 dark:border-yellow-800/30 bg-yellow-50 dark:bg-yellow-950/30">
                  <CardContent className="p-4">
                    <h4 className="mb-2">Unlock Premium</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground mb-3">
                      <li>• Ad-free experience</li>
                      <li>• 24-hour availability forecasts</li>
                      <li>• Smart parking insights</li>
                      <li>• Advanced filtering options</li>
                    </ul>
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => onViewChange('pricing')}
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