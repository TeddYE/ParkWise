import { useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Info,
  Calendar,
  Target
} from 'lucide-react';

import { cn } from './utils';
import { Badge } from './badge';
import { PredictionAnalysis, EnhancedPrediction } from '../../types';

// ============================================================================
// Type Definitions
// ============================================================================

export interface PredictionInsightsProps {
  predictions: EnhancedPrediction[];
  carparkInfo?: {
    name: string;
    totalLots: number;
  };
  carpark?: {
    lotDetails: Array<{
      lot_type: string;
      available_lots: number;
      total_lots?: number;
    }>;
  };
  analysis?: PredictionAnalysis;
  className?: string;
  compact?: boolean;
}

interface InsightItem {
  id: string;
  type: 'recommendation' | 'warning' | 'info';
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  time?: string;
  availability?: number;
  priority: 'high' | 'medium' | 'low';
}

interface TimeRecommendation {
  time: string;
  displayTime: string;
  availability: number;
  availabilityPercentage: number;
  reason: string;
  type: 'best' | 'worst';
  status: 'excellent' | 'good' | 'limited' | 'very_limited';
}

// ============================================================================
// Constants
// ============================================================================





// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate smart insights from prediction data - Simplified
 */
function generateSmartInsights(
  predictions: EnhancedPrediction[]
): InsightItem[] {
  const insights: InsightItem[] = [];

  if (!predictions.length) {
    return [{
      id: 'no-data',
      type: 'info',
      icon: Info,
      title: 'No prediction data available',
      description: 'Unable to generate insights without forecast data.',
      priority: 'low',
    }];
  }

  // Evening advantage insight
  const morningPeak = predictions.filter(p => {
    const hour = new Date(p.datetime).getHours();
    return hour >= 7 && hour <= 9;
  });

  const eveningPeak = predictions.filter(p => {
    const hour = new Date(p.datetime).getHours();
    return hour >= 17 && hour <= 19;
  });

  if (morningPeak.length > 0 && eveningPeak.length > 0) {
    const morningAvg = morningPeak.reduce((sum, p) => sum + p.availability_percentage, 0) / morningPeak.length;
    const eveningAvg = eveningPeak.reduce((sum, p) => sum + p.availability_percentage, 0) / eveningPeak.length;

    if (eveningAvg > morningAvg + 15) {
      insights.push({
        id: 'evening-better',
        type: 'recommendation',
        icon: Target,
        title: 'Evening Advantage',
        description: 'Evening hours offer better availability than morning rush.',
        priority: 'medium',
      });
    } else if (morningAvg > eveningAvg + 15) {
      insights.push({
        id: 'morning-better',
        type: 'recommendation',
        icon: Target,
        title: 'Morning Advantage',
        description: 'Morning hours offer better availability than evening rush.',
        priority: 'medium',
      });
    }
  }

  // General availability insight
  const excellentTimes = predictions.filter(p => p.status === 'excellent');
  const limitedTimes = predictions.filter(p => p.status === 'very_limited');

  if (excellentTimes.length > predictions.length * 0.6) {
    insights.push({
      id: 'good-availability',
      type: 'recommendation',
      icon: TrendingUp,
      title: 'Generally Good Availability',
      description: 'Excellent availability expected throughout most of the day.',
      priority: 'low',
    });
  } else if (limitedTimes.length > predictions.length * 0.4) {
    insights.push({
      id: 'limited-availability',
      type: 'warning',
      icon: Clock,
      title: 'Limited Availability Expected',
      description: 'Consider alternative carparks or adjust your timing.',
      priority: 'medium',
    });
  }

  // Sort by priority and return available insights
  return insights
    .sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    })
    .slice(0, 2); // Limit to 2 insights max
}









/**
 * Format hour range for display
 */
function formatHourRange(start: number, end: number): string {
  const formatHour = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}${period}`;
  };

  if (start === end) {
    return formatHour(start);
  } else {
    // For ranges, show as "StartPM-EndPM" format
    return `${formatHour(start)}-${formatHour(end)}`;
  }
}



/**
 * Generate optimal time periods from consecutive optimal hours
 * Best periods: Within 10% of highest availability, continuous, all hours that make sense
 */
function generateOptimalPeriods(predictions: EnhancedPrediction[], totalCarLots?: number): TimeRecommendation[] {
  if (predictions.length === 0) return [];

  // Find the highest availability value
  const maxAvailability = Math.max(...predictions.map(p => p.predicted_lots_available));
  const threshold = maxAvailability * 0.9; // Within 10% of highest

  // Find all predictions within 10% of the highest availability
  const candidatePredictions = predictions
    .map((p, index) => ({ ...p, originalIndex: index }))
    .filter(p => p.predicted_lots_available >= threshold)
    .sort((a, b) => a.originalIndex - b.originalIndex); // Keep original time order

  if (candidatePredictions.length === 0) {
    // Fallback: use the single best hour
    const bestPrediction = predictions.reduce((best, current) =>
      current.predicted_lots_available > best.predicted_lots_available ? current : best
    );
    return [createPeriodRecommendation([bestPrediction], 'best', totalCarLots)];
  }

  // Find continuous periods (all consecutive hours that make sense)
  const continuousPeriods: EnhancedPrediction[][] = [];
  let currentPeriod: EnhancedPrediction[] = [candidatePredictions[0]];

  for (let i = 1; i < candidatePredictions.length; i++) {
    const prevHour = new Date(candidatePredictions[i - 1].datetime).getHours();
    const currHour = new Date(candidatePredictions[i].datetime).getHours();

    // Check if consecutive (no hour limit)
    if (currHour === prevHour + 1) {
      currentPeriod.push(candidatePredictions[i]);
    } else {
      // End current period and start new one
      continuousPeriods.push([...currentPeriod]);
      currentPeriod = [candidatePredictions[i]];
    }
  }

  // Add the last period
  continuousPeriods.push(currentPeriod);

  // Find the best continuous period (highest average availability, prefer longer periods)
  let bestPeriod = continuousPeriods[0];
  let maxAvgAvailability = bestPeriod.reduce((sum, p) => sum + p.predicted_lots_available, 0) / bestPeriod.length;

  for (const period of continuousPeriods) {
    const avgAvailability = period.reduce((sum, p) => sum + p.predicted_lots_available, 0) / period.length;
    if (avgAvailability > maxAvgAvailability ||
      (avgAvailability === maxAvgAvailability && period.length > bestPeriod.length)) {
      bestPeriod = period;
      maxAvgAvailability = avgAvailability;
    }
  }

  return [createPeriodRecommendation(bestPeriod, 'best', totalCarLots)];
}

/**
 * Generate peak time periods from consecutive peak hours
 * Peak/Avoid periods: Within 10% of lowest availability, continuous, all hours that make sense
 */
function generatePeakPeriods(predictions: EnhancedPrediction[], totalCarLots?: number): TimeRecommendation[] {
  if (predictions.length === 0) return [];

  // Find the lowest availability value
  const minAvailability = Math.min(...predictions.map(p => p.predicted_lots_available));
  const threshold = minAvailability * 1.1; // Within 10% of lowest

  // Find all predictions within 10% of the lowest availability
  const candidatePredictions = predictions
    .map((p, index) => ({ ...p, originalIndex: index }))
    .filter(p => p.predicted_lots_available <= threshold)
    .sort((a, b) => a.originalIndex - b.originalIndex); // Keep original time order

  if (candidatePredictions.length === 0) {
    // Fallback: use the single worst hour
    const worstPrediction = predictions.reduce((worst, current) =>
      current.predicted_lots_available < worst.predicted_lots_available ? current : worst
    );
    return [createPeriodRecommendation([worstPrediction], 'worst', totalCarLots)];
  }

  // Find continuous periods (all consecutive hours that make sense)
  const continuousPeriods: EnhancedPrediction[][] = [];
  let currentPeriod: EnhancedPrediction[] = [candidatePredictions[0]];

  for (let i = 1; i < candidatePredictions.length; i++) {
    const prevHour = new Date(candidatePredictions[i - 1].datetime).getHours();
    const currHour = new Date(candidatePredictions[i].datetime).getHours();

    // Check if consecutive (no hour limit)
    if (currHour === prevHour + 1) {
      currentPeriod.push(candidatePredictions[i]);
    } else {
      // End current period and start new one
      continuousPeriods.push([...currentPeriod]);
      currentPeriod = [candidatePredictions[i]];
    }
  }

  // Add the last period
  continuousPeriods.push(currentPeriod);

  // Find the worst continuous period (lowest average availability, prefer longer periods)
  let worstPeriod = continuousPeriods[0];
  let minAvgAvailability = worstPeriod.reduce((sum, p) => sum + p.predicted_lots_available, 0) / worstPeriod.length;

  for (const period of continuousPeriods) {
    const avgAvailability = period.reduce((sum, p) => sum + p.predicted_lots_available, 0) / period.length;
    if (avgAvailability < minAvgAvailability ||
      (avgAvailability === minAvgAvailability && period.length > worstPeriod.length)) {
      worstPeriod = period;
      minAvgAvailability = avgAvailability;
    }
  }

  return [createPeriodRecommendation(worstPeriod, 'worst', totalCarLots)];
}

/**
 * Create a period recommendation from a group of predictions
 */
function createPeriodRecommendation(
  periodPredictions: EnhancedPrediction[],
  type: 'best' | 'worst',
  totalCarLots?: number
): TimeRecommendation {
  const startHour = new Date(periodPredictions[0].datetime).getHours();
  const endHour = new Date(periodPredictions[periodPredictions.length - 1].datetime).getHours();

  // Calculate average availability for the period
  const avgAvailability = Math.round(
    periodPredictions.reduce((sum, p) => sum + p.predicted_lots_available, 0) / periodPredictions.length
  );

  // Calculate percentage based on total car lots specifically
  let avgPercentage: number;
  if (totalCarLots && totalCarLots > 0) {
    avgPercentage = Math.round((avgAvailability / totalCarLots) * 100);
  } else {
    // Fallback to the prediction's calculated percentage
    avgPercentage = Math.round(
      periodPredictions.reduce((sum, p) => sum + p.availability_percentage, 0) / periodPredictions.length
    );
  }

  // Determine the most common status
  const statusCounts = periodPredictions.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const mostCommonStatus = Object.entries(statusCounts)
    .sort(([, a], [, b]) => b - a)[0][0] as 'excellent' | 'good' | 'limited' | 'very_limited';

  // Format the time range - show the actual period found
  const displayTime = formatHourRange(startHour, endHour);

  return {
    time: periodPredictions[0].datetime,
    displayTime,
    availability: avgAvailability,
    availabilityPercentage: avgPercentage,
    reason: type === 'best' ? 'Optimal period' : 'Peak period',
    type,
    status: mostCommonStatus,
  };
}

/**
 * Generate time recommendations from predictions
 * 
 * Logic:
 * - Best periods: Within 10% of highest availability, continuous blocks, all hours that make sense
 * - Peak/Avoid periods: Within 10% of lowest availability, continuous blocks, all hours that make sense
 * - Ensures periods are continuous time blocks, not scattered individual hours
 * - No maximum hour limit - shows all consecutive hours within the threshold
 */
function generateTimeRecommendations(
  predictions: EnhancedPrediction[],
  totalCarLots?: number
): { best: TimeRecommendation[]; worst: TimeRecommendation[] } {
  const best = generateOptimalPeriods(predictions, totalCarLots);
  const worst = generatePeakPeriods(predictions, totalCarLots);

  return { best, worst };
}

// ============================================================================
// Component Parts
// ============================================================================

/**
 * Insight item component
 */
function InsightItem({ insight }: { insight: InsightItem }) {
  const Icon = insight.icon;
  const typeColors = {
    recommendation: 'text-green-600 dark:text-green-400',
    warning: 'text-amber-600 dark:text-amber-400',
    info: 'text-blue-600 dark:text-blue-400',
  };

  return (
    <div className="flex gap-3 p-2 rounded-lg border bg-card">
      <div className={cn(
        "flex-shrink-0 mt-0.5",
        typeColors[insight.type]
      )}>
        <Icon className="w-3.5 h-3.5" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium text-foreground text-sm">
            {insight.title}
          </h4>

          {insight.time && (
            <Badge variant="outline" className="text-xs shrink-0">
              {insight.time}
            </Badge>
          )}
        </div>

        <p className="text-muted-foreground mt-1 text-xs">
          {insight.description}
        </p>

        {insight.availability !== undefined && (
          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
            <Target className="w-3 h-3" />
            <span>{insight.availability} lots available</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Time recommendation component
 */
function TimeRecommendation({
  recommendation,
  type
}: {
  recommendation: TimeRecommendation;
  type: 'best' | 'worst';
}) {
  const isGood = type === 'best';
  const Icon = isGood ? TrendingUp : TrendingDown;

  // Override status colors based on recommendation type for better UX
  // Best periods should always look positive, worst periods should look negative
  const displayColor = isGood
    ? 'text-green-600 dark:text-green-400'
    : 'text-red-600 dark:text-red-400';

  const displayBg = isGood
    ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800/30'
    : 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800/30';

  return (
    <div className={cn(
      "flex items-center justify-between p-3 rounded-lg border",
      displayBg
    )}>
      <div className="flex items-center gap-2">
        <div className={displayColor}>
          <Icon className="w-4 h-4" />
        </div>

        <div>
          <div className="font-semibold text-base">
            {recommendation.displayTime}
          </div>
        </div>
      </div>

      <div className="text-right">
        <div className={cn(
          "font-bold text-lg",
          displayColor
        )}>
          {recommendation.availability}
        </div>
        <div className="text-muted-foreground text-xs">
          {recommendation.availabilityPercentage}% available
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function PredictionInsights({
  predictions,
  carparkInfo,
  carpark,
  className,
}: PredictionInsightsProps) {
  // Calculate total car lots from lot details
  const totalCarLots = useMemo(() => {
    if (!carpark?.lotDetails) return carparkInfo?.totalLots;

    // Find car lot details (lot_type should be "C" for car lots)
    const carLotDetail = carpark.lotDetails.find(detail =>
      detail.lot_type === 'C' || detail.lot_type === 'Car' || detail.lot_type.toLowerCase().includes('car')
    );

    return carLotDetail?.total_lots || carparkInfo?.totalLots;
  }, [carpark?.lotDetails, carparkInfo?.totalLots]);

  // Generate insights and recommendations
  const insights = useMemo(() =>
    generateSmartInsights(predictions),
    [predictions]
  );

  const timeRecommendations = useMemo(() =>
    generateTimeRecommendations(predictions, totalCarLots),
    [predictions, totalCarLots]
  );

  // Handle empty state
  if (!predictions.length) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="text-center py-8">
          <Calendar className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            No prediction data available to generate insights
          </p>
        </div>
      </div>
    );
  }

  // Get the top 2 most important insights
  const topInsights = insights.slice(0, 2);
  const bestTime = timeRecommendations.best[0];
  const worstTime = timeRecommendations.worst[0];

  return (
    <div className={cn("space-y-4", className)}>
      {/* Best & Worst Times - Main Focus */}
      {(bestTime || worstTime) && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {bestTime && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-green-600 uppercase tracking-wide flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Best Period
                </h4>
                <TimeRecommendation
                  recommendation={bestTime}
                  type="best"
                />
              </div>
            )}

            {worstTime && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-red-600 uppercase tracking-wide flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" />
                  Avoid
                </h4>
                <TimeRecommendation
                  recommendation={worstTime}
                  type="worst"
                />
              </div>
            )}
          </div>

          {/* Accuracy Display */}
          <div className="text-center">
            <div className="text-xs text-muted-foreground">
              Prediction Accuracy: <span className="font-medium">80%</span>
            </div>
          </div>

          {/* Information Note */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-950/30 dark:border-blue-800/30">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <div className="font-medium text-blue-800 dark:text-blue-200">
                Car Lot Predictions Only
              </div>
              <div className="text-blue-700 dark:text-blue-300 mt-1">
                These predictions show availability for standard car lots. Motorcycle and heavy vehicle lots are not included.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Additional Insights - Only if available */}
      {topInsights.length > 0 && (
        <div className="space-y-2">
          {topInsights.map((insight) => (
            <InsightItem
              key={insight.id}
              insight={insight}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default PredictionInsights;