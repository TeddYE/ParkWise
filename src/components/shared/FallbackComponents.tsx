import { Button } from '../ui/button';
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react';

// Generic error fallback
interface ErrorFallbackProps {
  error: Error;
  retry: () => void;
  title?: string;
  description?: string;
}

export function ErrorFallback({ 
  error, 
  retry, 
  title = "Something went wrong",
  description = "An unexpected error occurred. Please try again."
}: ErrorFallbackProps) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {title}
        </h3>
        <p className="text-muted-foreground mb-4 text-sm">
          {description}
        </p>
        <Button onClick={retry} size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4 text-left">
            <summary className="cursor-pointer text-xs text-muted-foreground">
              Error Details
            </summary>
            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
              {error.toString()}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

// Network error fallback
interface NetworkErrorFallbackProps {
  retry: () => void;
  isOnline?: boolean;
}

export function NetworkErrorFallback({ retry, isOnline = true }: NetworkErrorFallbackProps) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        {isOnline ? (
          <Wifi className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        ) : (
          <WifiOff className="w-12 h-12 text-destructive mx-auto mb-4" />
        )}
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {isOnline ? 'Connection Problem' : 'No Internet Connection'}
        </h3>
        <p className="text-muted-foreground mb-4 text-sm">
          {isOnline 
            ? 'Unable to connect to our servers. Please check your connection and try again.'
            : 'Please check your internet connection and try again.'
          }
        </p>
        <Button onClick={retry} size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    </div>
  );
}

// Loading error fallback (for when data fails to load)
interface LoadingErrorFallbackProps {
  retry: () => void;
  resourceName?: string;
}

export function LoadingErrorFallback({ 
  retry, 
  resourceName = "data" 
}: LoadingErrorFallbackProps) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Failed to Load {resourceName}
        </h3>
        <p className="text-muted-foreground mb-4 text-sm">
          We couldn't load the {resourceName.toLowerCase()}. This might be a temporary issue.
        </p>
        <Button onClick={retry} size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    </div>
  );
}