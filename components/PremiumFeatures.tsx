import { useState } from 'react';
import { 
  Crown, 
  Calculator, 
  TrendingUp, 
  Bell, 
  Target, 
  Clock, 
  DollarSign,
  Zap,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Slider } from './ui/slider';
import { mockCarparks } from '../data/mockData';

interface PremiumFeaturesProps {
  isPremium: boolean;
  onViewChange: (view: string) => void;
}

export function PremiumFeatures({ isPremium, onViewChange }: PremiumFeaturesProps) {
  const [parkingDuration, setParkingDuration] = useState([2]);
  const [chargingDuration, setChargingDuration] = useState([1]);
  const [selectedCarpark, setSelectedCarpark] = useState(mockCarparks[0].id);
  const [showHistorical, setShowHistorical] = useState(false);

  if (!isPremium) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <Card className="text-center p-8 border-yellow-200 bg-yellow-50">
          <Crown className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
          <h2 className="text-2xl mb-4">Premium Features</h2>
          <p className="text-muted-foreground mb-6">
            Upgrade to Premium to access smart recommendations, cost calculator, 
            historical data, and waitlist notifications.
          </p>
          <Button onClick={() => onViewChange('pricing')}>
            Upgrade to Premium - S$3.99/month
          </Button>
        </Card>
      </div>
    );
  }

  const selectedCarparkData = mockCarparks.find(cp => cp.id === selectedCarpark);
  const totalCost = selectedCarparkData ? 
    (selectedCarparkData.rates.hourly * parkingDuration[0]) + 
    (selectedCarparkData.rates.evCharging * chargingDuration[0] * 25) : 0; // 25 kWh average

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex items-center gap-3 mb-6">
        <Crown className="w-6 h-6 text-yellow-600" />
        <h1 className="text-2xl">Premium Features</h1>
        <Badge className="bg-yellow-100 text-yellow-800">Active</Badge>
      </div>

      <Tabs defaultValue="calculator" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="calculator">Cost Calculator</TabsTrigger>
          <TabsTrigger value="recommender">Smart Recommender</TabsTrigger>
          <TabsTrigger value="historical">Historical Data</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        {/* Cost Calculator */}
        <TabsContent value="calculator">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Parking Cost Calculator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm mb-2 block">Select Carpark</label>
                  <Select value={selectedCarpark} onValueChange={setSelectedCarpark}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {mockCarparks.map(carpark => (
                        <SelectItem key={carpark.id} value={carpark.id}>
                          {carpark.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm mb-2 block">
                    Parking Duration: {parkingDuration[0]} hours
                  </label>
                  <Slider
                    value={parkingDuration}
                    onValueChange={setParkingDuration}
                    max={12}
                    min={0.5}
                    step={0.5}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="text-sm mb-2 block">
                    EV Charging: {chargingDuration[0]} hours
                  </label>
                  <Slider
                    value={chargingDuration}
                    onValueChange={setChargingDuration}
                    max={4}
                    min={0}
                    step={0.25}
                    className="w-full"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedCarparkData && (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Parking ({parkingDuration[0]}h)</span>
                      <span>S${(selectedCarparkData.rates.hourly * parkingDuration[0]).toFixed(2)}</span>
                    </div>
                    {chargingDuration[0] > 0 && (
                      <div className="flex justify-between">
                        <span>EV Charging ({chargingDuration[0]}h)</span>
                        <span>S${(selectedCarparkData.rates.evCharging * chargingDuration[0] * 25).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="border-t pt-2">
                      <div className="flex justify-between text-lg">
                        <span>Total Cost</span>
                        <span>S${totalCost.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      * EV charging calculated at 25 kWh average consumption
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Smart Recommender */}
        <TabsContent value="recommender">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Smart Carpark Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {mockCarparks.slice(0, 3).map((carpark, index) => {
                  const reasons = [
                    index === 0 ? 'Best value for money' : '',
                    index === 1 ? 'Closest to destination' : '',
                    index === 2 ? 'Highest availability' : ''
                  ].filter(Boolean);

                  return (
                    <Card key={carpark.id} className="relative">
                      {index === 0 && (
                        <Badge className="absolute -top-2 left-4 bg-green-600">
                          Recommended
                        </Badge>
                      )}
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{carpark.name}</CardTitle>
                        <div className="text-sm text-muted-foreground">
                          {reasons.join(', ')}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Distance</span>
                            <span>{carpark.distance}km</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Rate</span>
                            <span>S${carpark.rates.hourly}/hr</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Availability</span>
                            <span>{carpark.availableLots}/{carpark.totalLots}</span>
                          </div>
                        </div>
                        <Button className="w-full mt-3" size="sm">
                          Select This Carpark
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Historical Data */}
        <TabsContent value="historical">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Historical Availability Patterns
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm mb-2 block">Select Carpark for Analysis</label>
                  <Select value={selectedCarpark} onValueChange={setSelectedCarpark}>
                    <SelectTrigger className="w-full md:w-80">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {mockCarparks.map(carpark => (
                        <SelectItem key={carpark.id} value={carpark.id}>
                          {carpark.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Peak Hours Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Busiest Time</span>
                          <span className="text-red-600">12:00 PM - 2:00 PM</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Best Availability</span>
                          <span className="text-green-600">6:00 AM - 9:00 AM</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Average Occupancy</span>
                          <span>73%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Weekly Patterns</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Busiest Day</span>
                          <span className="text-red-600">Friday</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Least Busy</span>
                          <span className="text-green-600">Sunday</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Weekend vs Weekday</span>
                          <span>-35% occupancy</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="mb-2">💡 Smart Insights</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Best time to park: Sunday 8:00 AM (95% availability)</li>
                    <li>• Avoid: Friday 1:00 PM (only 15% availability)</li>
                    <li>• EV charging bays are typically 40% less busy on weekends</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Availability Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm mb-2 block">Carpark</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a carpark" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockCarparks.map(carpark => (
                        <SelectItem key={carpark.id} value={carpark.id}>
                          {carpark.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm mb-2 block">Alert when availability is above</label>
                  <div className="flex items-center gap-2">
                    <Input type="number" defaultValue="20" className="w-20" />
                    <span className="text-sm">lots available</span>
                  </div>
                </div>

                <Button className="w-full">
                  Set Availability Alert
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Active Notifications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm">Marina Bay Sands</div>
                        <div className="text-xs text-muted-foreground">Alert when &gt;30 lots available</div>
                      </div>
                      <Badge className="bg-green-600">Active</Badge>
                    </div>
                  </div>

                  <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm">ION Orchard</div>
                        <div className="text-xs text-muted-foreground">Waitlist for EV charging</div>
                      </div>
                      <Badge className="bg-yellow-600">Waitlist</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}