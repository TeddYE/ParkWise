import { useState, useEffect } from 'react';
import { User, Heart, Crown, Calendar, MapPin, Navigation, Trash2, ArrowLeft, Edit2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { User as UserType, Carpark, ViewType } from '../types';
import { useCarparks } from '../hooks/useCarparks';
import { toast } from "sonner";
import { AuthService } from '../services/authService';
import { validatePassword } from '../utils/validation';
import { getCarparkDisplayName } from '../utils/carpark';

interface ProfileViewProps {
  user: UserType;
  onViewChange: (view: ViewType) => void;
  onUpdateUser: (user: UserType) => void;
  onSelectCarpark: (carpark: Carpark) => void;
}

export function ProfileView({ user, onViewChange, onUpdateUser, onSelectCarpark }: ProfileViewProps) {
  const { carparks, loading } = useCarparks();
  const [favoriteCarparks, setFavoriteCarparks] = useState<Carpark[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState(user.name || '');
  const [editEmail, setEditEmail] = useState(user.email || user.user_id);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (carparks.length > 0 && user.favoriteCarparks) {
      const favorites = carparks.filter(cp => user.favoriteCarparks?.includes(cp.id));
      setFavoriteCarparks(favorites);
    }
  }, [carparks, user.favoriteCarparks]);

  const handleRemoveFavorite = async (carparkId: string) => {
    // Optimistically update UI
    const updatedFavorites = (user.favoriteCarparks || []).filter(id => id !== carparkId);
    onUpdateUser({
      ...user,
      favoriteCarparks: updatedFavorites,
    });
    
    // Call API to remove favorite
    const response = await AuthService.removeFavoriteCarpark(user, carparkId);
    
    if (response.user) {
      onUpdateUser(response.user);
      toast.success('Removed from favorites');
    } else {
      // Revert on failure
      onUpdateUser(user);
      toast.error(response.error || 'Failed to update favorites');
    }
  };

  const handleSaveProfile = async () => {
    // Validate inputs
    if (!editName.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    // If password fields are filled, validate them
    if (newPassword || confirmPassword) {
      if (!currentPassword) {
        toast.error('Please enter your current password');
        return;
      }

      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        toast.error(passwordValidation.errors[0]);
        return;
      }

      if (newPassword !== confirmPassword) {
        toast.error('New passwords do not match');
        return;
      }
    }

    setIsUpdating(true);

    try {
      // In a real app, this would call an API to update the profile
      // For now, we'll just update locally
      const updatedUser = {
        ...user,
        name: editName,
        email: editEmail,
      };

      onUpdateUser(updatedUser);
      setIsEditDialogOpen(false);

      toast.success('Profile updated successfully', {
        dismissible: true,
        closeButton: true,
      });

      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error('Failed to update profile', {
        dismissible: true,
        closeButton: true,
      });
    } finally {
      setIsUpdating(false);
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
              <p className="text-muted-foreground mb-6">{user.email || user.user_id}</p>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditDialogOpen(true)}
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
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
                      <h4 className="truncate">{getCarparkDisplayName(carpark)}</h4>
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
                      S${carpark.rates.hourly.toFixed(2)}/30min
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


      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your account information and password
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter your name"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="Enter your email"
              />
            </div>

            <Separator className="my-4" />

            <div className="space-y-3">
              <h4 className="text-sm">Change Password (Optional)</h4>

              {/* Current Password */}
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <div className="relative">
                  <Input
                    id="current-password"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setEditName(user.name || '');
                setEditEmail(user.email || user.user_id);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
              }}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveProfile} disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
