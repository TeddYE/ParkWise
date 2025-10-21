interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className={`animate-spin rounded-full border-b-2 border-primary ${sizeClasses[size]} ${className}`} />
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
  className = '' 
}: LoadingStateProps) {
  return (
    <div className={`flex items-center justify-center p-8 ${className}`}>
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