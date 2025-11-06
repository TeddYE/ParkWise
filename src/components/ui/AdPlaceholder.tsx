import { Card, CardContent } from './card';
import { Badge } from './badge';

interface AdPlaceholderProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export function AdPlaceholder({ size = 'medium', className = '' }: AdPlaceholderProps) {
  const sizeClasses = {
    small: 'h-20',
    medium: 'h-32',
    large: 'h-48'
  };

  // If className contains custom height, don't apply size classes
  const hasCustomHeight = className.includes('h-');
  const heightClass = hasCustomHeight ? '' : sizeClasses[size];

  return (
    <Card className={`bg-muted/30 border-dashed border-2 ${heightClass} ${className}`}>
      <CardContent className="flex flex-col items-center justify-center h-full p-4">
        <div className="text-center space-y-2">
          <Badge variant="outline" className="text-xs">
            Advertisement
          </Badge>
          <p className="text-xs text-muted-foreground">
            Upgrade to Premium for ad-free experience
          </p>
        </div>
      </CardContent>
    </Card>
  );
}