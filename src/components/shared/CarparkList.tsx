import { useState, useRef, useEffect, memo } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { CarparkCard } from './CarparkCard';
import { CarparkLoadingSkeleton } from './LoadingStates';
import { Carpark, User } from '@/types';
import { cn } from '@/utils/cn';
import { useExpensiveMemo, useExpensiveCallback } from '@/hooks/useExpensiveMemo';

interface CarparkListProps {
  carparks: Carpark[];
  onSelectCarpark: (carpark: Carpark) => void;
  showDistance?: boolean;
  showAvailability?: boolean;
  variant?: 'compact' | 'detailed';
  virtualized?: boolean;
  itemsPerPage?: number;
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  height?: number; // Height for virtualized list
  itemHeight?: number; // Height of each item for virtualization
  showFavorite?: boolean;
  user?: User;
  onToggleFavorite?: (carparkId: string, event?: React.MouseEvent) => void;
  onRetry?: () => void;
  className?: string;
  testId?: string;
}

export const CarparkList = memo(function CarparkList({
  carparks,
  onSelectCarpark,
  showDistance = false,
  showAvailability = true,
  variant = 'detailed',
  virtualized = false,
  itemsPerPage = 10,
  loading = false,
  error = null,
  emptyMessage = 'No carparks found',
  height = 600,
  itemHeight = variant === 'compact' ? 120 : 200,
  showFavorite = false,
  user,
  onToggleFavorite,
  onRetry,
  className,
  testId,
}: CarparkListProps) {
  const [visibleCount, setVisibleCount] = useState(Math.min(itemsPerPage, 50)); // Cap at 50 for performance
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Reset visible count when carparks change, but cap for performance
  useEffect(() => {
    setVisibleCount(Math.min(itemsPerPage, 50));
  }, [carparks.length, itemsPerPage]);

  // Infinite scroll handler for non-virtualized lists
  const handleScroll = useExpensiveCallback(() => {
    if (virtualized) return; // Don't use this for virtualized lists
    
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;

    if (isNearBottom && visibleCount < carparks.length && visibleCount < 200) { // Cap at 200 total items
      setVisibleCount((prev) => Math.min(prev + itemsPerPage, carparks.length, 200));
    }
  }, [virtualized, visibleCount, carparks.length, itemsPerPage], 'CarparkList-handleScroll');

  // Attach scroll listener for non-virtualized lists
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || virtualized) return;

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll, virtualized]);

  // Calculate visible items for custom virtualization
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const visibleStartIndex = virtualized ? Math.floor(scrollTop / itemHeight) : 0;
  const visibleEndIndex = virtualized 
    ? Math.min(visibleStartIndex + Math.ceil(height / itemHeight) + 1, carparks.length)
    : visibleCount;

  const displayedCarparks = useExpensiveMemo(() => {
    return virtualized 
      ? carparks.slice(visibleStartIndex, visibleEndIndex)
      : carparks.slice(0, visibleCount);
  }, [virtualized, carparks, visibleStartIndex, visibleEndIndex, visibleCount], 'CarparkList-displayedCarparks');

  // Handle scroll for custom virtualization
  const handleVirtualScroll = useExpensiveCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (virtualized) {
      setScrollTop(e.currentTarget.scrollTop);
    }
  }, [virtualized], 'CarparkList-handleVirtualScroll');

  // Memoize the calculated item height based on variant
  const calculatedItemHeight = useExpensiveMemo(() => {
    return itemHeight || (variant === 'compact' ? 120 : 200);
  }, [itemHeight, variant], 'CarparkList-calculatedItemHeight');

  // Loading state with skeleton
  if (loading) {
    return (
      <div className={cn("w-full", className)} data-testid={testId}>
        <CarparkLoadingSkeleton 
          count={Math.min(itemsPerPage, 6)} 
          variant={variant}
        />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn("text-center py-8", className)} data-testid={testId}>
        <div className="flex flex-col items-center gap-4">
          <AlertCircle className="w-12 h-12 text-muted-foreground" />
          <div>
            <p className="text-muted-foreground font-medium mb-2">Failed to load carparks</p>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (carparks.length === 0) {
    return (
      <div className={cn("text-center py-8", className)} data-testid={testId}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <p className="text-muted-foreground font-medium mb-1">No carparks found</p>
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  // Render virtualized list with custom implementation
  if (virtualized && carparks.length > 0) {
    const totalHeight = carparks.length * calculatedItemHeight;
    const offsetY = visibleStartIndex * calculatedItemHeight;

    return (
      <div 
        ref={containerRef}
        className={cn("w-full overflow-auto", className)}
        style={{ height }}
        onScroll={handleVirtualScroll}
        data-testid={testId}
        role="list"
        aria-label={`List of ${carparks.length} carparks`}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          <div style={{ transform: `translateY(${offsetY}px)` }}>
            <div className={cn(
              variant === 'detailed' 
                ? "grid grid-cols-1 lg:grid-cols-2 gap-4 p-2"
                : "space-y-3 p-2"
            )}>
              {displayedCarparks.map((carpark) => (
                <CarparkCard
                  key={carpark.id}
                  carpark={carpark}
                  onSelect={onSelectCarpark}
                  showDistance={showDistance}
                  showAvailability={showAvailability}
                  variant={variant}
                  showFavorite={showFavorite}
                  user={user}
                  onToggleFavorite={onToggleFavorite}
                />
              ))}
            </div>
          </div>
        </div>
        
        {/* Virtualization info for debugging */}
        {process.env.NODE_ENV === 'development' && (
          <div className="fixed bottom-4 right-4 bg-black/80 text-white text-xs p-2 rounded">
            Showing {visibleStartIndex + 1}-{Math.min(visibleEndIndex, carparks.length)} of {carparks.length}
          </div>
        )}
      </div>
    );
  }

  // Render regular list with infinite scroll
  return (
    <div 
      ref={scrollContainerRef}
      className={cn("space-y-4 overflow-y-auto", className)}
      data-testid={testId}
      role="list"
      aria-label={`List of ${carparks.length} carparks`}
    >
      {/* Grid layout for detailed cards, list for compact */}
      <div className={cn(
        variant === 'detailed' 
          ? "grid grid-cols-1 lg:grid-cols-2 gap-4 p-2"
          : "space-y-3 p-2"
      )}>
        {displayedCarparks.map((carpark) => (
          <CarparkCard
            key={carpark.id}
            carpark={carpark}
            onSelect={onSelectCarpark}
            showDistance={showDistance}
            showAvailability={showAvailability}
            variant={variant}
            showFavorite={showFavorite}
            user={user}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </div>

      {/* Loading indicator for infinite scroll */}
      {!virtualized && visibleCount < carparks.length && (
        <div className="flex justify-center py-4" role="status" aria-label="Loading more carparks">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <span className="sr-only">Loading more carparks...</span>
        </div>
      )}

      {/* End message for non-virtualized lists */}
      {!virtualized && visibleCount >= carparks.length && carparks.length > itemsPerPage && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          All {carparks.length} carparks loaded
        </div>
      )}

      {/* Performance info for debugging */}
      {process.env.NODE_ENV === 'development' && !virtualized && (
        <div className="fixed bottom-4 left-4 bg-black/80 text-white text-xs p-2 rounded">
          Showing {visibleCount} of {carparks.length} carparks
        </div>
      )}
    </div>
  );
});