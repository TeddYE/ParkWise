import { 
  Heart, 
  Navigation, 
  Share2, 
  MapPin,
  Clock,
  RefreshCw,
  Copy,
  Star
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { Carpark, User } from '@/types';
import { cn } from '@/utils/cn';
import { memo, useCallback } from 'react';

interface CarparkActionsProps {
  carpark: Carpark;
  user?: User;
  onToggleFavorite?: (carparkId: string) => void;
  onViewChange?: (view: string) => void;
  onRefresh?: () => void;
  onBookmark?: (carparkId: string) => void;
  isRefreshing?: boolean;
  showQuickInfo?: boolean;
  compact?: boolean;
  variant?: 'default' | 'minimal' | 'extended';
  className?: string;
  testId?: string;
}

export const CarparkActions = memo(function CarparkActions({
  carpark,
  user,
  onToggleFavorite,
  onViewChange,
  onRefresh,
  onBookmark,
  isRefreshing = false,
  showQuickInfo = true,
  compact = false,
  variant = 'default',
  className,
  testId,
}: CarparkActionsProps) {
  const isFavorite = user?.favoriteCarparks?.includes(carpark.id) || false;

  const handleToggleFavorite = useCallback(() => {
    if (!user || !onToggleFavorite) {
      toast.error('Please sign up to save favorites');
      onViewChange?.('login');
      return;
    }
    onToggleFavorite(carpark.id);
    toast.success(isFavorite ? 'Removed from favorites' : 'Added to favorites');
  }, [user, onToggleFavorite, onViewChange, carpark.id, isFavorite]);

  const handleGetDirections = useCallback(() => {
    // Open Google Maps with directions
    const destination = `${carpark.latitude},${carpark.longitude}`;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
    window.open(url, '_blank');
    toast.success('Opening directions in Google Maps');
  }, [carpark.latitude, carpark.longitude]);

  const handleShare = useCallback(async () => {
    const shareData = {
      title: `${carpark.name || carpark.address}`,
      text: `Check out this carpark: ${carpark.availableLots}/${carpark.totalLots} lots available`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(
          `${shareData.title}\n${shareData.text}\n${shareData.url}`
        );
        toast.success('Carpark details copied to clipboard');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      toast.error('Failed to share carpark details');
    }
  }, [carpark.name, carpark.address, carpark.availableLots, carpark.totalLots]);

  const handleCopyAddress = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(carpark.address);
      toast.success('Address copied to clipboard');
    } catch (error) {
      console.error('Error copying address:', error);
      toast.error('Failed to copy address');
    }
  }, [carpark.address]);

  const handleViewOnMap = useCallback(() => {
    // Open external map application
    const url = `https://maps.google.com/?q=${carpark.latitude},${carpark.longitude}`;
    window.open(url, '_blank');
    toast.success('Opening location in Google Maps');
  }, [carpark.latitude, carpark.longitude]);



  const handleBookmark = useCallback(() => {
    if (!user || !onBookmark) {
      toast.error('Please sign up to bookmark carparks');
      onViewChange?.('login');
      return;
    }
    onBookmark(carpark.id);
    toast.success('Carpark bookmarked for later');
  }, [user, onBookmark, onViewChange, carpark.id]);

  // Determine button size based on variant and compact mode
  const buttonSize = compact ? "sm" : variant === 'minimal' ? "sm" : "default";
  const iconSize = compact ? "w-3 h-3" : "w-4 h-4";

  return (
    <Card className={cn("w-full", className)} data-testid={testId}>
      <CardContent className={cn("p-4", compact && "p-3")}>
        {/* Quick Status Bar */}
        {showQuickInfo && !compact && (
          <div className="mb-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>Updated: {new Date().toLocaleTimeString()}</span>
                </div>
                {onRefresh && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onRefresh}
                    disabled={isRefreshing}
                    className="h-6 px-2"
                    aria-label="Refresh carpark data"
                  >
                    <RefreshCw className={cn("w-3 h-3", isRefreshing && "animate-spin")} />
                    <span className="ml-1 text-xs">Refresh</span>
                  </Button>
                )}
              </div>
              <Badge variant="secondary" className="text-xs">
                ID: {carpark.id}
              </Badge>
            </div>
          </div>
        )}

        <div className={cn(
          "grid gap-3",
          variant === 'minimal' ? "grid-cols-3" : 
          compact ? "grid-cols-2" : 
          "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
        )}>
          {/* Favorite Button */}
          <Button
            variant="outline"
            size={buttonSize}
            onClick={handleToggleFavorite}
            className={cn(
              "flex items-center gap-2 transition-colors",
              isFavorite && "text-red-600 border-red-200 bg-red-50 hover:bg-red-100 dark:bg-red-950 dark:border-red-800"
            )}
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart 
              className={cn(
                iconSize,
                "transition-all",
                isFavorite && "fill-current scale-110"
              )} 
            />
            {!compact && (
              <span className="hidden sm:inline">
                {isFavorite ? 'Saved' : 'Save'}
              </span>
            )}
          </Button>

          {/* Directions Button */}
          <Button
            variant="outline"
            size={buttonSize}
            onClick={handleGetDirections}
            className="flex items-center gap-2 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 dark:hover:bg-blue-950"
            aria-label="Get directions to carpark"
          >
            <Navigation className={iconSize} />
            {!compact && <span className="hidden sm:inline">Directions</span>}
          </Button>

          {/* Share Button */}
          <Button
            variant="outline"
            size={buttonSize}
            onClick={handleShare}
            className="flex items-center gap-2 hover:bg-green-50 hover:border-green-200 hover:text-green-700 dark:hover:bg-green-950"
            aria-label="Share carpark details"
          >
            <Share2 className={iconSize} />
            {!compact && <span className="hidden sm:inline">Share</span>}
          </Button>

          {variant !== 'minimal' && (
            <>
              {/* Copy Address Button */}
              <Button
                variant="outline"
                size={buttonSize}
                onClick={handleCopyAddress}
                className="flex items-center gap-2 hover:bg-gray-50 hover:border-gray-200 hover:text-gray-700 dark:hover:bg-gray-950"
                aria-label="Copy address to clipboard"
              >
                <Copy className={iconSize} />
                {!compact && <span className="hidden sm:inline">Copy</span>}
              </Button>

              {/* View on Map Button */}
              <Button
                variant="outline"
                size={buttonSize}
                onClick={handleViewOnMap}
                className="flex items-center gap-2 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700 dark:hover:bg-purple-950"
                aria-label="View location on map"
              >
                <MapPin className={iconSize} />
                {!compact && <span className="hidden sm:inline">View Map</span>}
              </Button>

              {/* Bookmark Button */}
              {onBookmark && (
                <Button
                  variant="outline"
                  size={buttonSize}
                  onClick={handleBookmark}
                  className="flex items-center gap-2 hover:bg-yellow-50 hover:border-yellow-200 hover:text-yellow-700 dark:hover:bg-yellow-950"
                  aria-label="Bookmark carpark"
                >
                  <Star className={iconSize} />
                  {!compact && <span className="hidden sm:inline">Bookmark</span>}
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
});