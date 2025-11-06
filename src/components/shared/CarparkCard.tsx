import { Car, Zap, Clock, DollarSign, Heart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Carpark, User } from '@/types';
import { getCarparkDisplayName } from '@/utils/carpark';
import { cn } from '@/utils/cn';
import { memo, useCallback, useMemo } from 'react';

interface CarparkCardProps {
  carpark: Carpark;
  onSelect: (carpark: Carpark) => void;
  showDistance?: boolean;
  showAvailability?: boolean;
  variant?: 'compact' | 'detailed';
  showFavorite?: boolean;
  user?: User;
  onToggleFavorite?: (carparkId: string, event?: React.MouseEvent) => void;
  className?: string;
}

export const CarparkCard = memo(function CarparkCard({
  carpark,
  onSelect,
  showDistance = false,
  showAvailability = true,
  variant = 'detailed',
  showFavorite = false,
  user,
  onToggleFavorite,
  className,
}: CarparkCardProps) {
  // Memoize expensive calculations
  const availabilityColor = useMemo(() => {
    const getAvailabilityColor = (available: number, total: number | null) => {
      if (total === null || total === 0) return 'text-gray-400';
      const percentage = (available / total) * 100;
      if (percentage > 30) return 'text-green-600';
      if (percentage > 10) return 'text-yellow-600';
      return 'text-red-600';
    };
    return getAvailabilityColor(carpark.availableLots, carpark.totalLots);
  }, [carpark.availableLots, carpark.totalLots]);

  const isCompact = useMemo(() => variant === 'compact', [variant]);
  
  const isFavorite = useMemo(() => 
    user?.favoriteCarparks?.includes(carpark.id) || false, 
    [user?.favoriteCarparks, carpark.id]
  );

  const displayName = useMemo(() => 
    getCarparkDisplayName(carpark), 
    [carpark]
  );

  // Memoize event handlers
  const handleFavoriteClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    onToggleFavorite?.(carpark.id, event);
  }, [onToggleFavorite, carpark.id]);

  const handleCardClick = useCallback(() => {
    onSelect(carpark);
  }, [onSelect, carpark]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(carpark);
    }
  }, [onSelect, carpark]);

  return (
    <Card 
      className={cn(
        "cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02]",
        "focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2",
        className
      )}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label={`Select ${displayName}`}
    >
      <CardHeader className={cn("pb-3", isCompact && "pb-2")}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className={cn(
              "line-clamp-2",
              isCompact ? "text-sm" : "text-base sm:text-lg"
            )}>
              {displayName}
            </CardTitle>

          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {showFavorite && onToggleFavorite && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleFavoriteClick}
                aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Heart
                  className={cn(
                    "w-4 h-4 transition-colors",
                    isFavorite ? 'fill-red-500 text-red-500' : 'text-muted-foreground hover:text-red-500'
                  )}
                />
              </Button>
            )}
            {showDistance && (
              <Badge variant="outline" className="text-xs">
                {carpark.distance !== undefined ? `${carpark.distance}km` : '-'}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className={cn(isCompact && "pt-0")}>
        {/* Availability Row */}
        {showAvailability && (
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4" />
                <span className={cn(
                  "text-sm",
                  availabilityColor
                )}>
                  {carpark.availableLots}/{carpark.totalLots !== null ? carpark.totalLots : 'N/A'} lots
                </span>
              </div>
              {carpark.evLots > 0 && (
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-blue-600">
                    {carpark.evLots} EV Lots
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Info Row */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{carpark.drivingTime !== undefined ? `${carpark.drivingTime} min drive` : '- min drive'}</span>
          </div>
          <div className="flex items-center gap-1">
            <DollarSign className="w-3 h-3" />
            <span>S${carpark.rates.hourly}/30min</span>
          </div>
        </div>

        {/* Features */}
        {!isCompact && (
          <div className="flex flex-wrap gap-1 mt-3">
            <Badge variant="outline" className="text-xs">
              {carpark.type}
            </Badge>
            {carpark.features?.slice(0, 2).map((feature) => (
              <Badge key={feature} variant="secondary" className="text-xs">
                {feature}
              </Badge>
            ))}
            {carpark.features && carpark.features.length > 2 && (
              <Badge variant="secondary" className="text-xs">
                +{carpark.features.length - 2} more
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for complex props
  return (
    prevProps.carpark.id === nextProps.carpark.id &&
    prevProps.carpark.availableLots === nextProps.carpark.availableLots &&
    prevProps.carpark.totalLots === nextProps.carpark.totalLots &&
    prevProps.carpark.evLots === nextProps.carpark.evLots &&
    prevProps.carpark.distance === nextProps.carpark.distance &&
    prevProps.carpark.drivingTime === nextProps.carpark.drivingTime &&
    prevProps.showDistance === nextProps.showDistance &&
    prevProps.showAvailability === nextProps.showAvailability &&
    prevProps.variant === nextProps.variant &&
    prevProps.showFavorite === nextProps.showFavorite &&
    prevProps.className === nextProps.className &&
    prevProps.user?.favoriteCarparks?.includes(prevProps.carpark.id) === 
    nextProps.user?.favoriteCarparks?.includes(nextProps.carpark.id) &&
    prevProps.onSelect === nextProps.onSelect &&
    prevProps.onToggleFavorite === nextProps.onToggleFavorite
  );
});