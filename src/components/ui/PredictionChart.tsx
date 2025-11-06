import { useMemo } from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Area,
  AreaChart,
  Bar,
  BarChart,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { Clock, TrendingUp, TrendingDown, AlertTriangle, RefreshCw } from 'lucide-react';

import { cn } from './utils';
import { Button } from './button';
import { Skeleton } from './skeleton';
import { ChartContainer, ChartTooltip, ChartConfig } from './chart';
import { EnhancedPrediction } from '../../types';

// ============================================================================
// Type Definitions
// ============================================================================

export interface PredictionChartProps {
  predictions: EnhancedPrediction[];
  carparkName: string;
  totalLots?: number;
  carpark?: {
    lotDetails: Array<{
      lot_type: string;
      available_lots: number;
      total_lots?: number;
    }>;
  };
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  className?: string;
  showInsights?: boolean;
  compact?: boolean;
  chartType?: 'area' | 'bar';
}

interface ChartDataPoint {
  time: string;
  hour: number;
  predicted_lots_available: number;
  availability_percentage: number;
  status: string;
  is_optimal_time: boolean;
  is_peak_time: boolean;
  confidence_level: string;
  displayTime: string;
  fullDateTime: string;
}

// ============================================================================
// Constants
// ============================================================================

const STATUS_COLORS = {
  excellent: '#22c55e', // green-500
  good: '#84cc16',      // lime-500
  limited: '#f59e0b',   // amber-500
  very_limited: '#ef4444', // red-500
} as const;

const STATUS_LABELS = {
  excellent: 'Excellent',
  good: 'Good',
  limited: 'Limited',
  very_limited: 'Very Limited',
} as const;



// Chart configuration for the chart system
const chartConfig: ChartConfig = {
  predicted_lots_available: {
    label: 'Available Lots',
    color: 'hsl(var(--primary))',
  },
  availability_percentage: {
    label: 'Availability %',
    color: 'hsl(var(--muted-foreground))',
  },
} satisfies ChartConfig;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Transform prediction data for chart consumption
 */
function transformPredictionData(predictions: EnhancedPrediction[]): ChartDataPoint[] {
  return predictions.map((prediction) => {
    const date = parseISO(prediction.datetime);
    const hour = date.getHours();
    
    return {
      time: format(date, 'HH:mm'),
      hour,
      predicted_lots_available: prediction.predicted_lots_available,
      availability_percentage: prediction.availability_percentage,
      status: prediction.status,
      is_optimal_time: prediction.is_optimal_time,
      is_peak_time: prediction.is_peak_time,
      confidence_level: prediction.confidence_level,
      displayTime: format(date, 'h:mm a'),
      fullDateTime: prediction.datetime,
    };
  });
}

/**
 * Get color for data point based on availability status
 */
function getStatusColor(status: string): string {
  return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.limited;
}



/**
 * Custom tooltip component for the chart
 */
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0].payload as ChartDataPoint;
  const statusColor = getStatusColor(data.status);
  const statusLabel = STATUS_LABELS[data.status as keyof typeof STATUS_LABELS];

  return (
    <div className="bg-background border border-border rounded-lg shadow-lg p-3 min-w-[200px]">
      <div className="flex items-center gap-2 mb-2">
        <Clock className="w-4 h-4 text-muted-foreground" />
        <span className="font-medium">{data.displayTime}</span>
      </div>
      
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Available Lots:</span>
          <span className="font-medium">{data.predicted_lots_available}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Availability:</span>
          <span className="font-medium">{data.availability_percentage.toFixed(1)}%</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Status:</span>
          <div className="flex items-center gap-1.5">
            <div 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: statusColor }}
            />
            <span className="font-medium text-sm">{statusLabel}</span>
          </div>
        </div>
        
        {data.is_optimal_time && (
          <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 text-sm">
            <TrendingUp className="w-3 h-3" />
            <span>Optimal period</span>
          </div>
        )}
        
        {data.is_peak_time && (
          <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 text-sm">
            <TrendingDown className="w-3 h-3" />
            <span>Peak period</span>
          </div>
        )}
        

      </div>
    </div>
  );
}

/**
 * Custom dot component for highlighting optimal and peak periods
 */
function CustomDot(props: any) {
  const { cx, cy, payload } = props;
  
  if (!payload) return null;
  
  const data = payload as ChartDataPoint;
  
  // Only show dots for optimal or peak periods
  if (!data.is_optimal_time && !data.is_peak_time) {
    return null;
  }
  
  const color = data.is_optimal_time ? '#22c55e' : '#ef4444';
  const size = 4;
  
  return (
    <circle
      cx={cx}
      cy={cy}
      r={size}
      fill={color}
      stroke="white"
      strokeWidth={1}
      className="drop-shadow-sm"
    />
  );
}

// ============================================================================
// Loading Skeleton Component
// ============================================================================

function ChartSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className="space-y-4">
      {!compact && (
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-24" />
        </div>
      )}
      
      <div className={cn("space-y-2", compact ? "h-48" : "h-64")}>
        <Skeleton className="h-full w-full" />
        <div className="flex justify-between">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
      
      {!compact && (
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Error State Component
// ============================================================================

function ChartError({ 
  error, 
  onRetry, 
  compact = false 
}: { 
  error: string; 
  onRetry?: () => void; 
  compact?: boolean;
}) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center space-y-4",
      compact ? "h-48" : "h-64"
    )}>
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10">
        <AlertTriangle className="w-6 h-6 text-destructive" />
      </div>
      
      <div className="space-y-2">
        <h3 className="font-medium text-foreground">Unable to load predictions</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          {error}
        </p>
      </div>
      
      {onRetry && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onRetry}
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </Button>
      )}
    </div>
  );
}

// ============================================================================
// Chart Insights Component
// ============================================================================

function ChartInsights({ 
  data 
}: { 
  data: ChartDataPoint[]; 
  totalLots?: number;
}) {
  const insights = useMemo(() => {
    if (!data.length) return null;
    
    const optimalTimes = data.filter(d => d.is_optimal_time);
    const peakTimes = data.filter(d => d.is_peak_time);
    const avgAvailability = data.reduce((sum, d) => sum + d.availability_percentage, 0) / data.length;
    
    return {
      optimalCount: optimalTimes.length,
      peakCount: peakTimes.length,
      avgAvailability: Math.round(avgAvailability),
      bestTime: data.reduce((best, current) => 
        current.predicted_lots_available > best.predicted_lots_available ? current : best
      ),
      worstTime: data.reduce((worst, current) => 
        current.predicted_lots_available < worst.predicted_lots_available ? current : worst
      ),
    };
  }, [data]);
  
  if (!insights) return null;
  
  return (
    <div className="grid grid-cols-2 gap-4 mt-4">
      <div className="bg-muted/50 rounded-lg p-3 space-y-1">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-green-600" />
          <span className="text-sm font-medium">Best Period</span>
        </div>
        <div className="text-lg font-semibold">{insights.bestTime.displayTime}</div>
        <div className="text-xs text-muted-foreground">
          {insights.bestTime.predicted_lots_available} lots available
        </div>
      </div>
      
      <div className="bg-muted/50 rounded-lg p-3 space-y-1">
        <div className="flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-red-600" />
          <span className="text-sm font-medium">Peak Period</span>
        </div>
        <div className="text-lg font-semibold">{insights.worstTime.displayTime}</div>
        <div className="text-xs text-muted-foreground">
          {insights.worstTime.predicted_lots_available} lots available
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function PredictionChart({
  predictions,
  carparkName,
  totalLots,
  carpark,
  loading = false,
  error,
  onRetry,
  className,
  showInsights = true,
  compact = false,
  chartType = 'area',
}: PredictionChartProps) {
  // Calculate car lot capacity from lot details
  const carLotCapacity = useMemo(() => {
    if (!carpark?.lotDetails) return totalLots;
    
    // Find car lot details (lot_type should be "C" for car lots)
    const carLotDetail = carpark.lotDetails.find(detail => 
      detail.lot_type === 'C' || detail.lot_type === 'Car' || detail.lot_type.toLowerCase().includes('car')
    );
    
    return carLotDetail?.total_lots || totalLots;
  }, [carpark?.lotDetails, totalLots]);

  // Transform data for chart
  const chartData = useMemo(() => {
    if (!predictions || predictions.length === 0) return [];
    return transformPredictionData(predictions);
  }, [predictions]);
  
  // Calculate chart dimensions
  const chartHeight = compact ? 200 : chartType === 'bar' ? 320 : 280;
  
  // Render loading state
  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        {!compact && (
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">24-Hour Forecast</h3>
            <p className="text-sm text-muted-foreground">
              Loading predictions for {carparkName}...
            </p>
          </div>
        )}
        <ChartSkeleton compact={compact} />
      </div>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <div className={cn("space-y-4", className)}>
        {!compact && (
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">24-Hour Forecast</h3>
            <p className="text-sm text-muted-foreground">
              Predictions for {carparkName}
            </p>
          </div>
        )}
        <ChartError error={error} onRetry={onRetry} compact={compact} />
      </div>
    );
  }
  
  // Render empty state
  if (!chartData.length) {
    return (
      <div className={cn("space-y-4", className)}>
        {!compact && (
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">24-Hour Forecast</h3>
            <p className="text-sm text-muted-foreground">
              No prediction data available for {carparkName}
            </p>
          </div>
        )}
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <div className="text-center space-y-2">
            <Clock className="w-8 h-8 mx-auto opacity-50" />
            <p className="text-sm">No forecast data available</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      {!compact && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">24-Hour Forecast</h3>
            {carLotCapacity && (
              <div className="text-sm text-muted-foreground">
                Car Lots: {carLotCapacity} total
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Predicted availability for {carparkName}
          </p>
        </div>
      )}
      
      {/* Chart */}
      <div className="w-full">
        <ChartContainer config={chartConfig} className="w-full" style={{ height: chartHeight }}>
          {chartType === 'bar' ? (
            <BarChart
              data={chartData}
              margin={{
                top: 10,
                right: 10,
                left: 0,
                bottom: 0,
              }}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                className="stroke-muted-foreground/30 dark:stroke-muted-foreground/50"
                vertical={false}
              />
              
              <XAxis
                dataKey="time"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                interval="preserveStartEnd"
              />
              
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                domain={[0, carLotCapacity || 'dataMax']}
              />

              <ChartTooltip content={<CustomTooltip />} />

              <Bar
                dataKey="predicted_lots_available"
                fill="hsl(220 70% 50%)"
                fillOpacity={0.9}
                radius={[2, 2, 0, 0]}
                stroke="hsl(220 70% 60%)"
                strokeWidth={1}
              />

              {carLotCapacity && (
                <ReferenceLine 
                  y={carLotCapacity * 0.8} 
                  stroke="hsl(var(--destructive))" 
                  strokeDasharray="5 5"
                  strokeOpacity={0.6}
                />
              )}
            </BarChart>
          ) : (
            <AreaChart
              data={chartData}
              margin={{
                top: 10,
                right: 10,
                left: 0,
                bottom: 0,
              }}
            >
            <defs>
              <linearGradient id="availabilityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            
            <CartesianGrid 
              strokeDasharray="3 3" 
              className="stroke-muted-foreground/20"
              vertical={false}
            />
            
            <XAxis
              dataKey="time"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              interval="preserveStartEnd"
              tickFormatter={(value, index) => {
                // Show every 4th hour for better readability
                const hour = chartData[index]?.hour;
                return hour !== undefined && hour % 4 === 0 ? value : '';
              }}
            />
            
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              domain={[0, 'dataMax']}
              tickFormatter={(value) => Math.round(value).toString()}
            />
            
            <ChartTooltip content={<CustomTooltip />} />
            
            {/* Area fill */}
            <Area
              type="monotone"
              dataKey="predicted_lots_available"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#availabilityGradient)"
              dot={<CustomDot />}
              activeDot={{
                r: 4,
                fill: 'hsl(var(--primary))',
                stroke: 'hsl(var(--background))',
                strokeWidth: 2,
              }}
            />
            
            {/* Reference lines for context */}
            {carLotCapacity && (
              <>
                <ReferenceLine
                  y={carLotCapacity * 0.8}
                  stroke={STATUS_COLORS.good}
                  strokeDasharray="2 2"
                  strokeOpacity={0.5}
                />
                <ReferenceLine
                  y={carLotCapacity * 0.3}
                  stroke={STATUS_COLORS.limited}
                  strokeDasharray="2 2"
                  strokeOpacity={0.5}
                />
              </>
            )}
          </AreaChart>
          )}
        </ChartContainer>
      </div>
      

      
      {/* Insights */}
      {showInsights && !compact && (
        <ChartInsights data={chartData} totalLots={totalLots} />
      )}
    </div>
  );
}

export default PredictionChart;