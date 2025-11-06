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

const STATUS_COLORS = {
  excellent: 'text-green-600 dark:text-green-400',
  good: 'text-lime-600 dark:text-lime-400',
  limited: 'text-amber-600 dark:text-amber-400',
  very_limited: 'text-red-600 dark:text-red-400',
} as const;

const STATUS_BG_COLORS = {
  excellent: 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800/30',
  good: 'bg-lime-50 border-lime-200 dark:bg-lime-950/30 dark:border-lime-800/30',
  limited: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/30',
  very_limited: 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800/30',
} as const;



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
    return `${formatHour(start)}-${formatHour(end)}`;
  }
}



/**
 * Generate optimal time periods from consecutive optimal hours
 */
function generateOptimalPeriods(predictions: EnhancedPrediction[]): TimeRecommendation[] {
  // Get optimal predictions sorted by hour
  const optimalPredictions = predictions
    .filter(p => p.is_optimal_time || p.status === 'excellent')
    .sort((a, b) => new Date(a.datetime).getHours() - new Date(b.datetime).getHours());

  if (optimalPredictions.length === 0) return [];

  // Group consecutive hours
  const periods: TimeRecommendation[] = [];
  let currentPeriod = [optimalPredictions[0]];

  for (let i = 1; i < optimalPredictions.length; i++) {
    const currentHour = new Date(optimalPredictions[i].datetime).getHours();
    const lastHour = new Date(currentPeriod[currentPeriod.length - 1].datetime).getHours();

    // If consecutive hour, add to current period
    if (currentHour === lastHour + 1) {
      currentPeriod.push(optimalPredictions[i]);
    } else {
      // End current period and start new one
      if (currentPeriod.length > 0) {
        periods.push(createPeriodRecommendation(currentPeriod, 'best'));
      }
      currentPeriod = [optimalPredictions[i]];
    }
  }

  // Add the last period
  if (currentPeriod.length > 0) {
    periods.push(createPeriodRecommendation(currentPeriod, 'best'));
  }

  // Sort by average availability and return top period
  return periods
    .sort((a, b) => b.availability - a.availability)
    .slice(0, 1);
}

/**
 * Generate peak time periods from consecutive peak hours
 */
function generatePeakPeriods(predictions: EnhancedPrediction[]): TimeRecommendation[] {
  // Get peak predictions sorted by hour
  const peakPredictions = predictions
    .filter(p => p.is_peak_time || p.status === 'very_limited')
    .sort((a, b) => new Date(a.datetime).getHours() - new Date(b.datetime).getHours());

  if (peakPredictions.length === 0) return [];

  // Group consecutive hours
  const periods: TimeRecommendation[] = [];
  let currentPeriod = [peakPredictions[0]];

  for (let i = 1; i < peakPredictions.length; i++) {
    const currentHour = new Date(peakPredictions[i].datetime).getHours();
    const lastHour = new Date(currentPeriod[currentPeriod.length - 1].datetime).getHours();

    // If consecutive hour, add to current period
    if (currentHour === lastHour + 1) {
      currentPeriod.push(peakPredictions[i]);
    } else {
      // End current period and start new one
      if (currentPeriod.length > 0) {
        periods.push(createPeriodRecommendation(currentPeriod, 'worst'));
      }
      currentPeriod = [peakPredictions[i]];
    }
  }

  // Add the last period
  if (currentPeriod.length > 0) {
    periods.push(createPeriodRecommendation(currentPeriod, 'worst'));
  }

  // Sort by availability (lowest first for worst periods) and return top period
  return periods
    .sort((a, b) => a.availability - b.availability)
    .slice(0, 1);
}

/**
 * Create a period recommendation from a group of predictions
 */
function createPeriodRecommendation(
  periodPredictions: EnhancedPrediction[],
  type: 'best' | 'worst'
): TimeRecommendation {
  const startHour = new Date(periodPredictions[0].datetime).getHours();
  const endHour = new Date(periodPredictions[periodPredictions.length - 1].datetime).getHours();

  // Calculate average availability for the period
  const avgAvailability = Math.round(
    periodPredictions.reduce((sum, p) => sum + p.predicted_lots_available, 0) / periodPredictions.length
  );

  const avgPercentage = Math.round(
    periodPredictions.reduce((sum, p) => sum + p.availability_percentage, 0) / periodPredictions.length
  );

  // Determine the most common status
  const statusCounts = periodPredictions.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const mostCommonStatus = Object.entries(statusCounts)
    .sort(([, a], [, b]) => b - a)[0][0] as 'excellent' | 'good' | 'limited' | 'very_limited';

  // Format the time range
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
 */
function generateTimeRecommendations(
  predictions: EnhancedPrediction[]
): { best: TimeRecommendation[]; worst: TimeRecommendation[] } {
  const best = generateOptimalPeriods(predictions);
  const worst = generatePeakPeriods(predictions);

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
  const statusColor = STATUS_COLORS[recommendation.status];
  const statusBg = STATUS_BG_COLORS[recommendation.status];

  return (
    <div className={cn(
      "flex items-center justify-between p-2 rounded-lg border",
      statusBg
    )}>
      <div className="flex items-center gap-2">
        <div className={statusColor}>
          <Icon className="w-3.5 h-3.5" />
        </div>

        <div>
          <div className="font-medium text-sm">
            {recommendation.displayTime}
          </div>
          <div className="text-muted-foreground text-xs">
            {recommendation.reason}
          </div>
        </div>
      </div>

      <div className="text-right">
        <div className={cn(
          "font-semibold text-sm",
          statusColor
        )}>
          {recommendation.availability}
        </div>
        <div className="text-muted-foreground text-xs">
          {recommendation.availabilityPercentage.toFixed(0)}%
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
  className,
}: PredictionInsightsProps) {
  // Generate insights and recommendations
  const insights = useMemo(() =>
    generateSmartInsights(predictions),
    [predictions]
  );

  const timeRecommendations = useMemo(() =>
    generateTimeRecommendations(predictions),
    [predictions]
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