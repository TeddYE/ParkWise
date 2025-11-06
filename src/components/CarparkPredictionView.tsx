import { useEffect } from 'react';
import { usePredictions } from '../hooks/usePredictions';
import { PredictionChart } from './ui/PredictionChart';
import { PredictionInsights } from './ui/PredictionInsights';
import { Button } from './ui/button';
import { RefreshCw, TrendingUp } from 'lucide-react';
import { Carpark } from '../types';

interface CarparkPredictionViewProps {
  carpark: Carpark;
}

/**
 * Optimized carpark prediction view that only fetches data when mounted
 * Uses 30-minute cache and request deduplication for optimal performance
 */
export function CarparkPredictionView({ carpark }: CarparkPredictionViewProps) {
  const {
    data,
    loading,
    error,
    cached,
    fetchPredictions,
    refreshPredictions,
    canRetry,
    retry,
  } = usePredictions({
    staleThreshold: 15, // Consider cache stale after 15 minutes
    retryAttempts: 2,   // Limit retries for better UX
  });

  // Fetch predictions when component mounts (lazy loading)
  useEffect(() => {
    if (carpark.id) {
      fetchPredictions(carpark.id, carpark.totalLots || undefined);
    }
  }, [carpark.id, carpark.totalLots, fetchPredictions]);

  const handleRefresh = () => {
    if (carpark.id) {
      refreshPredictions(carpark.id, carpark.totalLots || undefined);
    }
  };

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{carpark.name}</h2>
          <p className="text-sm text-muted-foreground">
            24-hour availability forecast
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {cached && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              Cached
            </span>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Prediction Chart */}
      <PredictionChart
        predictions={data?.predictions || []}
        carparkName={carpark.name}
        totalLots={carpark.totalLots || undefined}
        carpark={{
          lotDetails: carpark.lotDetails,
        }}
        loading={loading}
        error={error || undefined}
        onRetry={canRetry ? retry : undefined}
        showInsights={false} // We'll show insights separately
      />

      {/* Smart Insights */}
      {data && (
        <PredictionInsights
          predictions={data.predictions}
          carparkInfo={{
            name: carpark.name,
            totalLots: carpark.totalLots ?? 0,
          }}
          carpark={{
            lotDetails: carpark.lotDetails,
          }}
          analysis={data.analysis}
        />
      )}

      {/* Error State with Retry */}
      {error && !loading && (
        <div className="text-center py-8 space-y-4">
          <div className="text-red-600 dark:text-red-400">
            <TrendingUp className="w-8 h-8 mx-auto mb-2" />
            <p className="font-medium">Unable to load predictions</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          
          {canRetry && (
            <Button onClick={retry} variant="outline" size="sm">
              Try Again
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default CarparkPredictionView;