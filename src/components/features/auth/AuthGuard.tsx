import { ReactNode } from 'react';
import { useAuth } from '../../../hooks/useAuth';

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  requireAuth?: boolean;
}

export function AuthGuard({ 
  children, 
  fallback = null, 
  requireAuth = true 
}: AuthGuardProps) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    return <>{fallback}</>;
  }

  if (!requireAuth && isAuthenticated) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}