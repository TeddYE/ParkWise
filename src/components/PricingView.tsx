import { useState } from 'react';
import { Check, Crown, MapPin, Zap, Calculator, Bell, Star, DollarSign, Heart } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';

interface PricingViewProps {
  isPremium: boolean;
  onSubscribe: () => void;
  onViewChange: (view: string) => void;
  user?: any;
  onDowngrade?: () => void;
  selectedPlan?: 'monthly' | 'annual';
  onPlanChange?: (plan: 'monthly' | 'annual') => void;
}

export function PricingView({ isPremium, onSubscribe, onViewChange, user, onDowngrade, selectedPlan = 'monthly', onPlanChange }: PricingViewProps) {
  const [isAnnual, setIsAnnual] = useState(selectedPlan === 'annual');

  const handlePlanToggle = (annual: boolean) => {
    setIsAnnual(annual);
    if (onPlanChange) {
      onPlanChange(annual ? 'annual' : 'monthly');
    }
  };

  const freeFeatures = [
    'Live carpark availability',
    'EV charging bay information',
    'Save favorite carparks',
    'Interactive map with nearby carparks',
    'Basic search and filtering',
    'Cost calculator',
    'Carpark details and rates'
  ];

  const premiumFeatures = [
    'Everything in Free Plan',
    '24-hour availability forecasts',
    'Smart parking insights',
    'Advanced filtering options',
    'Ad-free experience'
  ];

  const monthlyPrice = 1.99;
  const annualPrice = 19.99;
  const annualSavings = (monthlyPrice * 12) - annualPrice;
  // Prices already include GST
  const monthlyPriceWithGST = monthlyPrice;
  const annualPriceWithGST = annualPrice;
  const annualSavingsWithGST = (monthlyPriceWithGST * 12) - annualPriceWithGST;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-3 sm:p-4">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl mb-3 sm:mb-4">Supercharge Your Parking Experience</h1>
          <p className="text-muted-foreground mb-4 sm:mb-6 text-sm sm:text-base">
            Join thousands of smart drivers saving time and money every day.
            <br className="hidden sm:block" />
            Revolutionary parking intelligence for Singapore's future.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6 sm:mb-8">
            <div className="flex items-center gap-3">
              <span className={`text-sm ${!isAnnual ? 'text-primary' : 'text-muted-foreground'}`}>Monthly</span>
              <Switch checked={isAnnual} onCheckedChange={handlePlanToggle} />
              <span className={`text-sm ${isAnnual ? 'text-primary' : 'text-muted-foreground'}`}>Annual</span>
            </div>
            {isAnnual && (
              <Badge className="bg-green-100 text-green-800">
                Save S${annualSavingsWithGST.toFixed(2)}
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Free Plan */}
          <Card className="relative">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Free Plan
              </CardTitle>
              <div className="text-3xl">S$0<span className="text-base text-muted-foreground">/month</span></div>
              <p className="text-muted-foreground">Perfect for occasional drivers</p>
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
                Includes advertisements
              </div>
              <Button
                variant="outline"
                className="w-full"
                disabled={!isPremium}
                onClick={isPremium ? onDowngrade : undefined}
              >
                {!isPremium ? 'Current Plan' : 'Downgrade to Free'}
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
                S${isAnnual ? (annualPriceWithGST / 12).toFixed(2) : monthlyPriceWithGST.toFixed(2)}
                <span className="text-base text-muted-foreground">
                  /{isAnnual ? 'month' : 'month'}
                </span>
              </div>
              {isAnnual && (
                <div className="text-sm text-muted-foreground">
                  Billed annually at S${annualPriceWithGST.toFixed(2)} (GST included)
                </div>
              )}
              {!isAnnual && (
                <div className="text-sm text-muted-foreground">
                  GST included
                </div>
              )}
              <p className="text-muted-foreground">For drivers who demand the ultimate parking experience</p>
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
                onClick={() => {
                  if (!user) {
                    onViewChange('login');
                  } else {
                    onSubscribe();
                  }
                }}
                disabled={isPremium}
              >
                {isPremium ? 'Current Plan' : (user ? 'Upgrade to Premium' : 'Login to Subscribe')}
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
                      { feature: 'Cost calculator', free: true, premium: true, icon: Calculator },
                      { feature: 'Basic search & filtering', free: true, premium: true, icon: Bell },
                      { feature: 'Save favorite carparks', free: true, premium: true, icon: Heart },
                      { feature: '24-hour forecasts', free: false, premium: true, icon: Star },
                      { feature: 'Smart parking insights', free: false, premium: true, icon: Bell },
                      { feature: 'Advanced filtering', free: false, premium: true, icon: Bell },
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
                Find parking faster with real-time availability data
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
                Built-in cost calculator helps you find affordable parking
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
                Reduce emissions with optimized routes and EV charging integration
              </p>
            </CardContent>
          </Card>
        </div>


      </div>
    </div>
  );
}