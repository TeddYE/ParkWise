import { 
  ArrowLeft, 
  Navigation, 
  Car, 
  Clock, 
  DollarSign, 
  MapPin, 
  Star,
  Heart
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Carpark, User } from '../types';
import { toast } from "sonner";
import { updateFavoriteCarparks } from '../services/updateProfileService';
import { getCarparkDisplayName } from '../utils/carpark';


interface CarparkDetailsProps {
  carpark: Carpark;
  onBack: () => void;
  onViewChange: (view: string) => void;
  isPremium: boolean;
  user?: User;
  onUpdateUser?: (user: User) => void;
}

export function CarparkDetails({ carpark, onBack, onViewChange, isPremium, user, onUpdateUser }: CarparkDetailsProps) {
  const getAvailabilityStatus = (available: number, total: number | null) => {
    if (total === null || total === 0) {
      return { text: 'Unknown', color: 'bg-gray-100 text-gray-800' };
    }
    const percentage = (available / total) * 100;
    if (percentage > 30) return { text: 'Good Availability', color: 'bg-green-100 text-green-800' };
    if (percentage > 10) return { text: 'Limited Availability', color: 'bg-yellow-100 text-yellow-800' };
    return { text: 'Very Limited', color: 'bg-red-100 text-red-800' };
  };

  const availabilityStatus = getAvailabilityStatus(carpark.availableLots, carpark.totalLots);
  
  const isFavorite = user?.favoriteCarparks?.includes(carpark.id) || false;
  
  const handleToggleFavorite = async () => {
    if (!user || !onUpdateUser) {
      toast.error('Please login to save favorites');
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
    const response = await updateFavoriteCarparks({
      user_id: user.user_id,
      fav_carparks: updatedFavorites,
    });
    
    if (response.success) {
      toast.success(isFavorite ? 'Removed from favorites' : 'Added to favorites');
    } else {
      // Revert on failure
      onUpdateUser(user);
      toast.error(response.error || 'Failed to update favorites');
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-3 sm:p-4 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3 flex-1">
          <Button variant="outline" size="icon" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl break-words">{getCarparkDisplayName(carpark)}</h1>
            {carpark.name && carpark.name.trim() !== '' && (
              <p className="text-muted-foreground text-sm sm:text-base break-words">{carpark.address}</p>
            )}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-4">
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
                    variant="outline"
                    onClick={() => onViewChange('premium')}
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

        {/* Actions Sidebar */}
        <div className="space-y-4">
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
                onClick={() => {
                  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
                  const mapsUrl = isIOS
                    ? `maps://maps.apple.com/?daddr=${carpark.coordinates.lat},${carpark.coordinates.lng}&dirflg=d`
                    : `https://www.google.com/maps/dir/?api=1&destination=${carpark.coordinates.lat},${carpark.coordinates.lng}`;
                  window.open(mapsUrl, '_blank');
                }}
              >
                <MapPin className="w-4 h-4 mr-2" />
                Open in Maps
              </Button>
              <div className="text-sm text-muted-foreground text-center">
                <Clock className="w-3 h-3 inline mr-1" />
                {carpark.drivingTime !== undefined ? `${carpark.drivingTime} min drive` : '- min drive'} • {carpark.distance !== undefined ? `${carpark.distance}km` : '-'} away
              </div>
            </CardContent>
          </Card>



          {/* Premium Features */}
          {!isPremium && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="p-4">
                <h4 className="mb-2">🚀 Premium Features</h4>
                <ul className="text-sm space-y-1 text-muted-foreground mb-3">
                  <li>• Historical availability patterns</li>
                  <li>• Cost calculator</li>
                  <li>• Waitlist notifications</li>
                  <li>• Smart recommendations</li>
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
          )}

          {isPremium && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <h4 className="mb-2">⭐ Premium Actions</h4>
                <div className="space-y-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full"
                    onClick={() => onViewChange('premium')}
                  >
                    View Historical Data
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full"
                  >
                    Join Waitlist
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full"
                  >
                    Set Availability Alert
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}