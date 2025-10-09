import { 
  ArrowLeft, 
  Navigation, 
  Car, 
  Zap, 
  Clock, 
  DollarSign, 
  MapPin, 
  Shield, 
  CreditCard,
  Star,
  Bus
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Carpark } from '../types';
import { mockPublicTransport } from '../data/mockData';

interface CarparkDetailsProps {
  carpark: Carpark;
  onBack: () => void;
  onViewChange: (view: string) => void;
  isPremium: boolean;
}

export function CarparkDetails({ carpark, onBack, onViewChange, isPremium }: CarparkDetailsProps) {
  const getAvailabilityStatus = (available: number, total: number) => {
    const percentage = (available / total) * 100;
    if (percentage > 30) return { text: 'Good Availability', color: 'bg-green-100 text-green-800' };
    if (percentage > 10) return { text: 'Limited Availability', color: 'bg-yellow-100 text-yellow-800' };
    return { text: 'Very Limited', color: 'bg-red-100 text-red-800' };
  };

  const availabilityStatus = getAvailabilityStatus(carpark.availableLots, carpark.totalLots);

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl">{carpark.name}</h1>
          <p className="text-muted-foreground">{carpark.address}</p>
        </div>
        <Badge className={availabilityStatus.color}>
          {availabilityStatus.text}
        </Badge>
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
                  <div className="text-xs text-muted-foreground">of {carpark.totalLots} total</div>
                </div>
                {carpark.evLots > 0 && (
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl mb-1 text-blue-600">{carpark.availableEvLots}</div>
                    <div className="text-sm text-blue-600">EV Charging Bays</div>
                    <div className="text-xs text-muted-foreground">of {carpark.evLots} total</div>
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
                  <span>Hourly Rate</span>
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
                <Clock className="w-4 h-4" />
                <span>Operating Hours: {carpark.operatingHours}</span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                <span>Payment: {carpark.paymentMethods.join(', ')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>Security: 24/7 CCTV Monitoring</span>
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
                onClick={() => onViewChange('navigation')}
              >
                <MapPin className="w-4 h-4 mr-2" />
                Get Directions
              </Button>
              <div className="text-sm text-muted-foreground text-center">
                <Clock className="w-3 h-3 inline mr-1" />
                {carpark.walkingTime} min walk • {carpark.distance}km away
              </div>
            </CardContent>
          </Card>

          {/* Public Transport */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bus className="w-5 h-5" />
                Public Transport
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mockPublicTransport
                .filter(route => route.to === carpark.name)
                .map((route, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{route.duration}</span>
                    <span>S${route.cost.toFixed(2)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {route.routes.join(' → ')} • {route.transfers} transfer{route.transfers !== 1 ? 's' : ''}
                  </div>
                </div>
              ))}
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
  );
}