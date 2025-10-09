import { useState } from 'react';
import { 
  Navigation, 
  MapPin, 
  Car, 
  Bus, 
  Clock, 
  Navigation2,
  ExternalLink,
  ArrowLeft,
  Zap
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Separator } from './ui/separator';
import { mockPublicTransport } from '../data/mockData';
import { Carpark } from '../types';

interface NavigationViewProps {
  carpark: Carpark;
  onBack: () => void;
}

export function NavigationView({ carpark, onBack }: NavigationViewProps) {
  const [selectedRoute, setSelectedRoute] = useState<'driving' | 'walking' | 'public'>('driving');

  const drivingRoutes = [
    {
      name: 'Fastest Route',
      duration: '12 mins',
      distance: '3.2 km',
      traffic: 'Light traffic',
      description: 'Via Marina Bay Link',
      badge: 'Recommended'
    },
    {
      name: 'Shortest Route', 
      duration: '15 mins',
      distance: '2.8 km',
      traffic: 'Moderate traffic',
      description: 'Via Raffles Boulevard',
      badge: null
    }
  ];

  const walkingRoutes = [
    {
      name: 'Direct Walking Route',
      duration: `${carpark.walkingTime} mins`,
      distance: `${carpark.distance} km`,
      description: 'Most direct pedestrian path',
      badge: 'Shortest'
    },
    {
      name: 'Scenic Route',
      duration: `${carpark.walkingTime + 5} mins`,
      distance: `${(carpark.distance + 0.3).toFixed(1)} km`,
      description: 'Via Marina Bay Waterfront',
      badge: null
    }
  ];

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="outline" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl">Navigate to {carpark.name}</h1>
          <p className="text-muted-foreground">{carpark.address}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Route Options */}
        <div className="lg:col-span-2">
          <Tabs value={selectedRoute} onValueChange={(value) => setSelectedRoute(value as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="driving" className="flex items-center gap-2">
                <Car className="w-4 h-4" />
                Driving
              </TabsTrigger>
              <TabsTrigger value="walking" className="flex items-center gap-2">
                <Navigation className="w-4 h-4" />
                Walking
              </TabsTrigger>
              <TabsTrigger value="public" className="flex items-center gap-2">
                <Bus className="w-4 h-4" />
                Public
              </TabsTrigger>
            </TabsList>

            {/* Driving Routes */}
            <TabsContent value="driving" className="space-y-4 mt-4">
              {drivingRoutes.map((route, index) => (
                <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium">{route.name}</h3>
                          {route.badge && (
                            <Badge className="bg-green-100 text-green-800">
                              {route.badge}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-1">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {route.duration}
                          </div>
                          <div className="flex items-center gap-1">
                            <Navigation2 className="w-3 h-3" />
                            {route.distance}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{route.description}</p>
                        <p className="text-xs text-blue-600 mt-1">{route.traffic}</p>
                      </div>
                      <Button size="sm">
                        Select Route
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Walking Routes */}
            <TabsContent value="walking" className="space-y-4 mt-4">
              {walkingRoutes.map((route, index) => (
                <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium">{route.name}</h3>
                          {route.badge && (
                            <Badge className="bg-blue-100 text-blue-800">
                              {route.badge}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-1">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {route.duration}
                          </div>
                          <div className="flex items-center gap-1">
                            <Navigation2 className="w-3 h-3" />
                            {route.distance}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{route.description}</p>
                      </div>
                      <Button size="sm">
                        Start Walking
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Public Transport */}
            <TabsContent value="public" className="space-y-4 mt-4">
              {mockPublicTransport
                .filter(route => route.to === carpark.name)
                .map((route, index) => (
                <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium">MRT Route</h3>
                          <Badge className="bg-purple-100 text-purple-800">
                            {route.transfers} transfer{route.transfers !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-1">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {route.duration}
                          </div>
                          <div className="flex items-center gap-1">
                            <Bus className="w-3 h-3" />
                            S${route.cost.toFixed(2)}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {route.routes.join(' → ')}
                        </p>
                      </div>
                      <Button size="sm">
                        Use Public Transport
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </div>

        {/* Navigation Actions */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" variant="outline">
                <ExternalLink className="w-4 h-4 mr-2" />
                Open in Google Maps
              </Button>
              <Button className="w-full" variant="outline">
                <ExternalLink className="w-4 h-4 mr-2" />
                Open in Apple Maps
              </Button>
              <Button className="w-full" variant="outline">
                <Navigation className="w-4 h-4 mr-2" />
                Start Voice Navigation
              </Button>
            </CardContent>
          </Card>

          {/* Destination Info */}
          <Card>
            <CardHeader>
              <CardTitle>Destination Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-sm text-muted-foreground">Current Availability</div>
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4" />
                  <span>{carpark.availableLots}/{carpark.totalLots} lots</span>
                </div>
                {carpark.evLots > 0 && (
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-blue-600" />
                    <span>{carpark.availableEvLots}/{carpark.evLots} EV bays</span>
                  </div>
                )}
              </div>
              
              <Separator />
              
              <div>
                <div className="text-sm text-muted-foreground">Parking Rate</div>
                <div>S${carpark.rates.hourly}/hour</div>
              </div>
              
              <div>
                <div className="text-sm text-muted-foreground">Operating Hours</div>
                <div>{carpark.operatingHours}</div>
              </div>
            </CardContent>
          </Card>

          {/* Live Updates */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <h4 className="text-sm mb-2">🔔 Live Updates</h4>
              <p className="text-xs text-muted-foreground">
                You'll receive notifications about availability changes during your journey.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Map Placeholder */}
      <Card className="mt-6">
        <CardContent className="p-8 text-center">
          <MapPin className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg mb-2">Interactive Navigation Map</h3>
          <p className="text-muted-foreground">
            Turn-by-turn navigation would be displayed here with real-time traffic updates
          </p>
        </CardContent>
      </Card>
    </div>
  );
}