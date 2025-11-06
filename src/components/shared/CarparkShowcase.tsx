import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { 
  CarparkList, 
  CarparkInfo, 
  CarparkActions,
  LoadingState,
  CarparkLoadingSkeleton,
  MapLoadingState,
  SearchLoadingState
} from './index';
import { Carpark, User } from '../../types';
import { cn } from '../../utils/cn';

interface CarparkShowcaseProps {
  carparks: Carpark[];
  user?: User;
  onSelectCarpark: (carpark: Carpark) => void;
  onToggleFavorite?: (carparkId: string) => void;
  onViewChange?: (view: string) => void;
  className?: string;
}

/**
 * CarparkShowcase - Demonstrates usage of all shared carpark components
 * This component serves as both documentation and a practical example
 * of how to use the shared carpark components together.
 */
export function CarparkShowcase({
  carparks,
  user,
  onSelectCarpark,
  onToggleFavorite,
  onViewChange,
  className,
}: CarparkShowcaseProps) {
  const [selectedCarpark, setSelectedCarpark] = useState<Carpark | null>(null);
  const [loading, setLoading] = useState(false);
  const [listVariant, setListVariant] = useState<'compact' | 'detailed'>('detailed');
  const [virtualized, setVirtualized] = useState(false);
  const [showLoadingDemo, setShowLoadingDemo] = useState(false);

  const handleSelectCarpark = (carpark: Carpark) => {
    setSelectedCarpark(carpark);
    onSelectCarpark(carpark);
  };

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  const demoLoadingStates = () => {
    setShowLoadingDemo(true);
    setTimeout(() => setShowLoadingDemo(false), 3000);
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>Shared Carpark Components Showcase</CardTitle>
          <p className="text-muted-foreground">
            Demonstration of reusable carpark components with various configurations
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={listVariant === 'detailed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setListVariant('detailed')}
            >
              Detailed View
            </Button>
            <Button
              variant={listVariant === 'compact' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setListVariant('compact')}
            >
              Compact View
            </Button>
            <Button
              variant={virtualized ? 'default' : 'outline'}
              size="sm"
              onClick={() => setVirtualized(!virtualized)}
            >
              {virtualized ? 'Disable' : 'Enable'} Virtualization
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={demoLoadingStates}
            >
              Demo Loading States
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
            >
              Refresh Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading States Demo */}
      {showLoadingDemo && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Loading State</CardTitle>
            </CardHeader>
            <CardContent>
              <LoadingState message="Loading carparks..." />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Map Loading</CardTitle>
            </CardHeader>
            <CardContent>
              <MapLoadingState />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Search Loading</CardTitle>
            </CardHeader>
            <CardContent>
              <SearchLoadingState showProgress progress={65} />
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Carpark List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Carpark List</CardTitle>
              <div className="flex gap-2">
                <Badge variant="outline">{carparks.length} carparks</Badge>
                <Badge variant={virtualized ? 'default' : 'secondary'}>
                  {virtualized ? 'Virtualized' : 'Standard'}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <CarparkLoadingSkeleton count={3} variant={listVariant} />
            ) : (
              <CarparkList
                carparks={carparks}
                onSelectCarpark={handleSelectCarpark}
                variant={listVariant}
                virtualized={virtualized}
                height={400}
                showDistance
                showAvailability
                showFavorite
                user={user}
                onToggleFavorite={onToggleFavorite}
                loading={loading}
                className="max-h-96"
              />
            )}
          </CardContent>
        </Card>

        {/* Selected Carpark Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Carpark Details</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedCarpark ? (
              <div className="space-y-4">
                <CarparkInfo
                  carpark={selectedCarpark}
                  showFullDetails
                />
                
                <Separator />
                
                <div>
                  <h4 className="font-medium mb-3">Actions</h4>
                  <CarparkActions
                    carpark={selectedCarpark}
                    user={user}
                    onToggleFavorite={onToggleFavorite}
                    onViewChange={onViewChange}
                    onRefresh={handleRefresh}
                    isRefreshing={loading}
                    showQuickInfo
                  />
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-3">Compact Variants</h4>
                  <div className="space-y-3">
                    <CarparkInfo
                      carpark={selectedCarpark}
                      compact
                      showFullDetails={false}
                    />
                    <CarparkActions
                      carpark={selectedCarpark}
                      user={user}
                      onToggleFavorite={onToggleFavorite}
                      compact
                      variant="minimal"
                      showQuickInfo={false}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Select a carpark from the list to view details
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Component Usage Examples */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Usage Examples</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">CarparkList Component</h4>
              <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`<CarparkList
  carparks={carparks}
  onSelectCarpark={handleSelect}
  variant="detailed" // or "compact"
  virtualized={true} // for large lists
  showDistance={true}
  showFavorite={true}
  user={user}
  onToggleFavorite={handleFavorite}
/>`}
              </pre>
            </div>

            <div>
              <h4 className="font-medium mb-2">CarparkInfo Component</h4>
              <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`<CarparkInfo
  carpark={selectedCarpark}
  showFullDetails={true}
  compact={false} // for smaller displays
/>`}
              </pre>
            </div>

            <div>
              <h4 className="font-medium mb-2">CarparkActions Component</h4>
              <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`<CarparkActions
  carpark={carpark}
  user={user}
  onToggleFavorite={handleFavorite}
  onViewChange={handleViewChange}
  variant="default" // "minimal" or "extended"
  compact={false}
  showQuickInfo={true}
/>`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}