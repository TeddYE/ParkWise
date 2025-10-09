import { useState } from 'react';
import { Check, Crown, MapPin, Zap, Calculator, TrendingUp, Bell, Star, DollarSign } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';

interface PricingViewProps {
  isPremium: boolean;
  onSubscribe: () => void;
  onViewChange: (view: string) => void;
}

export function PricingView({ isPremium, onSubscribe, onViewChange }: PricingViewProps) {
  const [isAnnual, setIsAnnual] = useState(false);

  const freeFeatures = [
    'Live carpark availability',
    'EV charging bay information', 
    'Map view with nearby carparks',
    'Basic search and filtering',
    'Public transport routes',
    'Carpark details and rates'
  ];

  const premiumFeatures = [
    'All free features',
    'Smart carpark recommender',
    'Parking cost calculator',
    'Historical availability data',
    'Availability notifications',
    'Waitlist for full carparks',
    'Ad-free experience',
    'Priority customer support'
  ];

  const monthlyPrice = 3.99;
  const annualPrice = 39.99;
  const annualSavings = (monthlyPrice * 12) - annualPrice;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl mb-4">Choose Your Plan</h1>
        <p className="text-muted-foreground mb-6">
          Find parking smarter with ParkWise. Support Singapore's Green Plan 2030.
        </p>
        
        <div className="flex items-center justify-center gap-3 mb-8">
          <span className={`text-sm ${!isAnnual ? 'text-primary' : 'text-muted-foreground'}`}>Monthly</span>
          <Switch checked={isAnnual} onCheckedChange={setIsAnnual} />
          <span className={`text-sm ${isAnnual ? 'text-primary' : 'text-muted-foreground'}`}>Annual</span>
          {isAnnual && (
            <Badge className="bg-green-100 text-green-800 ml-2">
              Save S${annualSavings.toFixed(2)}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Free Plan */}
        <Card className="relative">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Free Plan
            </CardTitle>
            <div className="text-3xl">S$0<span className="text-base text-muted-foreground">/month</span></div>
            <p className="text-muted-foreground">Perfect for occasional parking needs</p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 mb-6">
              {freeFeatures.map((feature, index) => (
                <li key={index} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
            <div className="text-xs text-muted-foreground mb-4">
              ⚠️ Includes advertisements
            </div>
            <Button 
              variant="outline" 
              className="w-full"
              disabled={!isPremium}
            >
              {!isPremium ? 'Current Plan' : 'Downgrade'}
            </Button>
          </CardContent>
        </Card>

        {/* Premium Plan */}
        <Card className="relative border-primary shadow-lg">
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <Badge className="bg-primary text-primary-foreground px-4 py-1">
              <Crown className="w-3 h-3 mr-1" />
              Most Popular
            </Badge>
          </div>
          
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-600" />
              Premium Plan
            </CardTitle>
            <div className="text-3xl">
              S${isAnnual ? (annualPrice / 12).toFixed(2) : monthlyPrice.toFixed(2)}
              <span className="text-base text-muted-foreground">
                /{isAnnual ? 'month' : 'month'}
              </span>
            </div>
            {isAnnual && (
              <div className="text-sm text-muted-foreground">
                Billed annually at S${annualPrice.toFixed(2)}
              </div>
            )}
            <p className="text-muted-foreground">For frequent drivers and parking optimization</p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 mb-6">
              {premiumFeatures.map((feature, index) => (
                <li key={index} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
            
            <Button 
              className="w-full"
              onClick={onSubscribe}
              disabled={isPremium}
            >
              {isPremium ? 'Current Plan' : `Upgrade to Premium`}
            </Button>
            
            {!isPremium && (
              <p className="text-xs text-center text-muted-foreground mt-2">
                Cancel anytime • No long-term commitment
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Feature Comparison */}
      <div className="mt-12">
        <h2 className="text-2xl text-center mb-6">Feature Comparison</h2>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4">Features</th>
                    <th className="text-center p-4">Free</th>
                    <th className="text-center p-4">Premium</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { feature: 'Live carpark availability', free: true, premium: true, icon: MapPin },
                    { feature: 'EV charging information', free: true, premium: true, icon: Zap },
                    { feature: 'Smart recommender system', free: false, premium: true, icon: Star },
                    { feature: 'Cost calculator', free: false, premium: true, icon: Calculator },
                    { feature: 'Historical data & insights', free: false, premium: true, icon: TrendingUp },
                    { feature: 'Availability alerts', free: false, premium: true, icon: Bell },
                    { feature: 'Ad-free experience', free: false, premium: true, icon: Crown },
                  ].map((item, index) => (
                    <tr key={index} className="border-b last:border-b-0">
                      <td className="p-4 flex items-center gap-2">
                        <item.icon className="w-4 h-4 text-muted-foreground" />
                        {item.feature}
                      </td>
                      <td className="text-center p-4">
                        {item.free ? (
                          <Check className="w-4 h-4 text-green-600 mx-auto" />
                        ) : (
                          <span className="text-muted-foreground">–</span>
                        )}
                      </td>
                      <td className="text-center p-4">
                        {item.premium ? (
                          <Check className="w-4 h-4 text-green-600 mx-auto" />
                        ) : (
                          <span className="text-muted-foreground">–</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Value Proposition */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="text-center">
          <CardContent className="p-6">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="mb-2">Save Time</h3>
            <p className="text-sm text-muted-foreground">
              Find parking 3x faster with smart recommendations
            </p>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="p-6">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="mb-2">Save Money</h3>
            <p className="text-sm text-muted-foreground">
              Calculate costs and find the best deals every time
            </p>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="p-6">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="mb-2">Go Green</h3>
            <p className="text-sm text-muted-foreground">
              Support Singapore's Green Plan with EV-friendly parking
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Trial CTA */}
      {!isPremium && (
        <Card className="mt-8 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-6 text-center">
            <h3 className="text-lg mb-2">🚀 Try Premium Features</h3>
            <p className="text-muted-foreground mb-4">
              Experience smart parking recommendations and cost savings
            </p>
            <Button onClick={() => onViewChange('premium')}>
              Explore Premium Features
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}