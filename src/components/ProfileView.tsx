import { useState, useEffect } from 'react';
import { User, Heart, Crown, Calendar, MapPin, Navigation, Trash2, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Avatar, AvatarFallback } from './ui/avatar';
import { User as UserType, Carpark, ViewType } from '../types';
import { useCarparks } from '../hooks/useCarparks';
import { toast } from "sonner";
import { getSubscriptionDaysRemaining, updateFavoriteCarparks } from '../services/updateProfileService';

interface ProfileViewProps {
  user: UserType;
  onViewChange: (view: ViewType) => void;
  onUpdateUser: (user: UserType) => void;
  onSelectCarpark: (carpark: Carpark) => void;
}

export function ProfileView({ user, onViewChange, onUpdateUser, onSelectCarpark }: ProfileViewProps) {
  const { carparks, loading } = useCarparks();
  const [favoriteCarparks, setFavoriteCarparks] = useState<Carpark[]>([]);

  useEffect(() => {
    if (carparks.length > 0 && user.favoriteCarparks) {
      const favorites = carparks.filter(cp => user.favoriteCarparks?.includes(cp.id));
      setFavoriteCarparks(favorites);
    }
  }, [carparks, user.favoriteCarparks]);

  const handleRemoveFavorite = async (carparkId: string) => {
    const updatedFavorites = (user.favoriteCarparks || []).filter(id => id !== carparkId);
    
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
      toast.success('Removed from favorites');
    } else {
      // Revert on failure
      onUpdateUser(user);
      toast.error(response.error || 'Failed to update favorites');
    }
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email?.slice(0, 2).toUpperCase() || 'U';
  };

  const formatDate = (date?: Date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-SG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const isPremium = user.subscription === 'premium';

  return (
    <div className="h-full overflow-auto bg-gradient-to-br from-muted/30 via-background to-muted/20">
      <div className="max-w-5xl mx-auto p-3 sm:p-6 pb-8 sm:pb-12 space-y-4 sm:space-y-6">
        {/* Page Title */}
        <div className="pt-3 sm:pt-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewChange('map')}
            className="mb-3 sm:mb-4 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Map
          </Button>
          <h1 className="mb-2 text-2xl sm:text-3xl">My Profile</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Manage your account, subscription, and favorite parking locations
          </p>
        </div>

        {/* User Profile Header */}
        <Card className="border-2">
        <CardContent className="p-4 sm:p-8">
          <div className="flex flex-col md:flex-row items-start gap-4 sm:gap-6">
            <Avatar className="w-16 h-16 sm:w-24 sm:h-24 border-2 sm:border-4 border-muted">
              <AvatarFallback className="bg-primary text-primary-foreground text-xl sm:text-3xl">
                {getInitials(user.name, user.email)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
                <h1>{user.name || 'User'}</h1>
                {isPremium && (
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200 w-fit">
                    <Crown className="w-3 h-3 mr-1" />
                    Premium Member
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground mb-6">{user.email}</p>
              
              <div className="flex flex-wrap items-center gap-3">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onViewChange('pricing')}
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Manage Subscription
                </Button>
                {favoriteCarparks.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md">
                    <Heart className="w-4 h-4 text-red-500" />
                    <span className="text-sm">
                      {favoriteCarparks.length} Favorite{favoriteCarparks.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5" />
            Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Plan Type</p>
              <div className="flex items-center gap-2">
                <p className="font-medium">
                  {isPremium ? 'Premium' : 'Free'}
                </p>
              </div>
            </div>
            
            {isPremium && (
              <>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Expires On</p>
                  <p className="font-medium">{formatDate(user.subscriptionExpiry)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Status</p>
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    Active
                  </Badge>
                </div>
              </>
            )}
            
            {!isPremium && (
              <div className="md:col-span-2">
                <p className="text-sm text-muted-foreground mb-2">Upgrade to unlock premium features</p>
                <Button 
                  size="sm"
                  onClick={() => onViewChange('pricing')}
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade to Premium
                </Button>
              </div>
            )}
          </div>

          {isPremium && (
            <>
              <Separator className="my-4" />
              <div>
                <h3 className="mb-3">Premium Features</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-600"></div>
                    Smart carpark recommender
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-600"></div>
                    Parking cost calculator
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-600"></div>
                    Historical availability data
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-600"></div>
                    Availability notifications
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-600"></div>
                    Waitlist for full carparks
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-600"></div>
                    Ad-free experience
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Favorite Carparks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5" />
            Favorite Carparks
            {favoriteCarparks.length > 0 && (
              <Badge variant="secondary">{favoriteCarparks.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading favorites...</p>
            </div>
          ) : favoriteCarparks.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2">No favorites yet</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                Save your frequently visited carparks for quick access. Tap the heart icon on any carpark to add it to your favorites.
              </p>
              <Button 
                onClick={() => onViewChange('map')}
              >
                <MapPin className="w-4 h-4 mr-2" />
                Explore Carparks
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {favoriteCarparks.map((carpark) => (
                <div
                  key={carpark.id}
                  className="flex items-center gap-4 p-5 rounded-lg border-2 bg-card hover:border-primary/20 hover:shadow-sm transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="truncate">{carpark.name}</h4>
                      {carpark.availableLots > 0 ? (
                        <Badge className="bg-green-100 text-green-800 border-green-200">
                          {carpark.availableLots} lots
                        </Badge>
                      ) : (
                        <Badge variant="destructive">Full</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate mb-1">
                      {carpark.address}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      S${carpark.rates.hourly.toFixed(2)}/hr
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSelectCarpark(carpark)}
                    >
                      <Navigation className="w-4 h-4 mr-2" />
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFavorite(carpark.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="justify-start h-auto py-4"
              onClick={() => onViewChange('map')}
            >
              <MapPin className="w-5 h-5 mr-3" />
              <div className="text-left">
                <div>Find Parking</div>
                <div className="text-xs text-muted-foreground font-normal">Browse map view</div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="justify-start h-auto py-4"
              onClick={() => onViewChange('search')}
            >
              <Navigation className="w-5 h-5 mr-3" />
              <div className="text-left">
                <div>Search Carparks</div>
                <div className="text-xs text-muted-foreground font-normal">Find by location</div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="justify-start h-auto py-4"
              onClick={() => onViewChange('pricing')}
            >
              <Crown className="w-5 h-5 mr-3" />
              <div className="text-left">
                <div>View Plans</div>
                <div className="text-xs text-muted-foreground font-normal">Pricing & billing</div>
              </div>
            </Button>
            {isPremium && (
              <Button
                variant="outline"
                className="justify-start h-auto py-4"
                onClick={() => onViewChange('premium')}
              >
                <Crown className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <div>Premium Features</div>
                  <div className="text-xs text-muted-foreground font-normal">Exclusive tools</div>
                </div>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
