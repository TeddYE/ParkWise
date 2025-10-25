import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <Loader2 className={cn('animate-spin text-muted-foreground', sizeClasses[size], className)} />
  );
}

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingState({ 
  message = 'Loading...', 
  size = 'md',
  className 
}: LoadingStateProps) {
  return (
    <div className={cn('flex items-center justify-center p-8', className)}>
      <div className="text-center">
        <LoadingSpinner size={size} className="mx-auto mb-4" />
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

interface FullPageLoadingProps {
  message?: string;
}

export function FullPageLoading({ message = 'Loading...' }: FullPageLoadingProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <LoadingState message={message} size="lg" />
    </div>
  );
}

interface CarparkLoadingSkeletonProps {
  count?: number;
  variant?: 'compact' | 'detailed';
  className?: string;
}

export function CarparkLoadingSkeleton({ 
  count = 3, 
  variant = 'detailed',
  className 
}: CarparkLoadingSkeletonProps) {
  const skeletons = Array.from({ length: count }, (_, i) => (
    <div 
      key={i} 
      className={cn(
        'animate-pulse bg-muted rounded-lg p-4 space-y-3',
        variant === 'compact' ? 'h-24' : 'h-48'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-muted-foreground/20 rounded w-3/4" />
          <div className="h-3 bg-muted-foreground/20 rounded w-1/2" />
        </div>
        <div className="h-6 bg-muted-foreground/20 rounded w-16" />
      </div>
      
      {variant === 'detailed' && (
        <>
          <div className="flex gap-4">
            <div className="h-3 bg-muted-foreground/20 rounded w-20" />
            <div className="h-3 bg-muted-foreground/20 rounded w-24" />
          </div>
          <div className="flex gap-2">
            <div className="h-6 bg-muted-foreground/20 rounded w-16" />
            <div className="h-6 bg-muted-foreground/20 rounded w-20" />
          </div>
        </>
      )}
    </div>
  ));

  return (
    <div className={cn('space-y-4', className)}>
      {skeletons}
    </div>
  );
}

interface MapLoadingStateProps {
  message?: string;
  className?: string;
}

export function MapLoadingState({ 
  message = 'Loading map...', 
  className 
}: MapLoadingStateProps) {
  return (
    <div className={cn(
      'flex items-center justify-center bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/20',
      'min-h-[400px] w-full',
      className
    )}>
      <div className="text-center">
        <LoadingSpinner size="lg" className="mx-auto mb-4" />
        <p className="text-muted-foreground font-medium">{message}</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Please wait while we load the interactive map
        </p>
      </div>
    </div>
  );
}

interface SearchLoadingStateProps {
  message?: string;
  showProgress?: boolean;
  progress?: number;
  className?: string;
}

export function SearchLoadingState({ 
  message = 'Searching carparks...', 
  showProgress = false,
  progress = 0,
  className 
}: SearchLoadingStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center p-8', className)}>
      <LoadingSpinner size="lg" className="mb-4" />
      <p className="text-muted-foreground font-medium mb-2">{message}</p>
      
      {showProgress && (
        <div className="w-full max-w-xs">
          <div className="bg-muted rounded-full h-2 overflow-hidden">
            <div 
              className="bg-primary h-full transition-all duration-300 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            {Math.round(progress)}% complete
          </p>
        </div>
      )}
    </div>
  );
}