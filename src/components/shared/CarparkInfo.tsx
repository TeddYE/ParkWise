import { 
  Car, 
  Zap, 
  Clock, 
  DollarSign, 
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Carpark, getCarparkTotalLots, getCarparkAvailableLots } from '@/types';
import { getCarparkDisplayName } from '@/utils/carpark';
import { cn } from '@/utils/cn';
import { memo } from 'react';

interface CarparkInfoProps {
  carpark: Carpark;
  showFullDetails?: boolean;
  compact?: boolean;
  className?: string;
  testId?: string;
}

export const CarparkInfo = memo(function CarparkInfo({ 
  carpark, 
  showFullDetails = true,
  compact = false,
  className,
  testId
}: CarparkInfoProps) {
  const getAvailabilityColor = (available: number, total: number | null) => {
    if (total === null || total === 0) return 'text-gray-500';
    const percentage = (available / total) * 100;
    if (percentage > 30) return 'text-green-600 dark:text-green-400';
    if (percentage > 10) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getAvailabilityStatus = (available: number, total: number | null) => {
    if (total === null || total === 0) return 'Unknown';
    const percentage = (available / total) * 100;
    if (percentage > 50) return 'Good Availability';
    if (percentage > 30) return 'Moderate Availability';
    if (percentage > 10) return 'Limited Availability';
    return 'Very Limited';
  };

  const getAvailabilityIcon = (available: number, total: number | null) => {
    if (total === null || total === 0) return AlertTriangle;
    const percentage = (available / total) * 100;
    if (percentage > 30) return CheckCircle;
    if (percentage > 10) return AlertTriangle;
    return XCircle;
  };

  const formatCarparkType = (carparkType: string): string => {
    return carparkType
      .split(' ')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };



  const totalLots = getCarparkTotalLots(carpark);
  const availableLots = getCarparkAvailableLots(carpark);
  const AvailabilityIcon = getAvailabilityIcon(availableLots, totalLots);

  return (
    <Card className={cn("w-full", className)} data-testid={testId}>
      <CardHeader className={cn(compact && "pb-3")}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className={cn(
              "mb-2 truncate",
              compact ? "text-base" : "text-lg sm:text-xl"
            )}>
              {getCarparkDisplayName(carpark)}
            </CardTitle>

          </div>
          <div className="flex flex-col gap-2 items-end">
            {carpark.distance !== undefined && (
              <Badge variant="outline" className="flex-shrink-0">
                {carpark.distance}km away
              </Badge>
            )}
            <div className="flex items-center gap-1">
              <AvailabilityIcon className={cn(
                "w-4 h-4",
                getAvailabilityColor(availableLots, totalLots)
              )} />
              <span className={cn(
                "text-xs font-medium",
                getAvailabilityColor(availableLots, totalLots)
              )}>
                {availableLots}/{totalLots || 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className={cn("space-y-4", compact && "space-y-3 pt-0")}>
        {/* Availability Section */}
        {!compact && (
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Car className="w-4 h-4" />
              Breakdown by Lot Type
            </h4>
            
            {/* Show breakdown by lot type if available */}
            {carpark.lotDetails && carpark.lotDetails.length > 0 ? (
              <div className="space-y-3">
                {carpark.lotDetails
                  .filter(lot => ['C', 'Y', 'H'].includes(lot.lot_type) && lot.total_lots && lot.total_lots > 0)
                  .map((lot) => {
                    const getLotIcon = (lotType: string) => {
                      switch (lotType) {
                        case 'C': return <Car className="w-4 h-4" />;
                        case 'Y': return <div className="w-4 h-4 flex items-center justify-center text-xs font-bold">M</div>;
                        case 'H': return <div className="w-4 h-4 flex items-center justify-center text-xs font-bold">H</div>;
                        default: return <Car className="w-4 h-4" />;
                      }
                    };

                    const getLotTypeName = (lotType: string) => {
                      switch (lotType) {
                        case 'C': return 'Car Lots';
                        case 'Y': return 'Motorcycle Lots';
                        case 'H': return 'Heavy Vehicle Lots';
                        default: return 'Lots';
                      }
                    };

                    return (
                      <div key={lot.lot_type} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-2">
                          {getLotIcon(lot.lot_type)}
                          <span className="font-medium">{getLotTypeName(lot.lot_type)}</span>
                        </div>
                        <div className="text-right">
                          <div className={cn("text-lg font-semibold", getAvailabilityColor(lot.available_lots, lot.total_lots || null))}>
                            {lot.available_lots}/{lot.total_lots || 'N/A'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            available/total
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              // Fallback to aggregated view if no lot details
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Available Lots</p>
                  <p className={cn("text-lg font-semibold", getAvailabilityColor(availableLots, totalLots))}>
                    {availableLots} / {totalLots || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className={cn("text-sm font-medium", getAvailabilityColor(availableLots, totalLots))}>
                    {getAvailabilityStatus(availableLots, totalLots)}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* EV Charging Info */}
        {carpark.evLots > 0 && (
          <div className={cn(
            "p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800",
            compact && "p-2"
          )}>
            <div className="flex items-center gap-2">
              <Zap className={cn("text-blue-600 dark:text-blue-400", compact ? "w-3 h-3" : "w-4 h-4")} />
              <span className={cn(
                "font-medium text-blue-900 dark:text-blue-100",
                compact ? "text-xs" : "text-sm"
              )}>
                {carpark.evLots} EV Charging Lots
                {!compact && " Available"}
              </span>
            </div>
          </div>
        )}

        {!compact && <Separator />}

        {/* Pricing & Time Section */}
        <div className={cn(
          "grid gap-4",
          compact ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2"
        )}>
          <div>
            <h4 className={cn(
              "font-medium mb-2 flex items-center gap-2",
              compact && "text-sm"
            )}>
              <DollarSign className={cn(compact ? "w-3 h-3" : "w-4 h-4")} />
              Pricing
            </h4>
            <div className="space-y-1">
              <p className={cn(compact ? "text-xs" : "text-sm")}>
                <span className="text-muted-foreground">30 min:</span> S${carpark.rates.hourly}
              </p>
              <p className={cn(compact ? "text-xs" : "text-sm")}>
                <span className="text-muted-foreground">Daily:</span> S${carpark.rates.daily}
              </p>
            </div>
          </div>

          <div>
            <h4 className={cn(
              "font-medium mb-2 flex items-center gap-2",
              compact && "text-sm"
            )}>
              <Clock className={cn(compact ? "w-3 h-3" : "w-4 h-4")} />
              Travel Time
            </h4>
            <p className={cn(compact ? "text-xs" : "text-sm")}>
              <span className="text-muted-foreground">Driving:</span>{' '}
              {carpark.drivingTime !== undefined ? `${carpark.drivingTime} min` : 'Calculating...'}
            </p>
          </div>
        </div>

        {showFullDetails && !compact && (
          <>
            <Separator />

            {/* Carpark Details */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Info className="w-4 h-4" />
                Details
              </h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Type</p>
                  <Badge variant="secondary">
                    {formatCarparkType(carpark.car_park_type)}
                  </Badge>
                </div>



                {carpark.type_of_parking_system && (
                  <div className="sm:col-span-2">
                    <p className="text-sm text-muted-foreground mb-1">Parking System</p>
                    <p className="text-sm">{carpark.type_of_parking_system}</p>
                  </div>
                )}

                {carpark.paymentMethods && carpark.paymentMethods.length > 0 && (
                  <div className="sm:col-span-2">
                    <p className="text-sm text-muted-foreground mb-1">Payment Methods</p>
                    <div className="flex flex-wrap gap-1">
                      {carpark.paymentMethods.map((method) => (
                        <Badge key={method} variant="outline" className="text-xs">
                          {method}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Features */}
            {carpark.features && carpark.features.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-2">Features</h4>
                  <div className="flex flex-wrap gap-2">
                    {carpark.features.map((feature) => (
                      <Badge key={feature} variant="secondary" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Operating Hours */}
            {carpark.operatingHours && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Operating Hours
                  </h4>
                  <p className="text-sm text-muted-foreground">{carpark.operatingHours}</p>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
});