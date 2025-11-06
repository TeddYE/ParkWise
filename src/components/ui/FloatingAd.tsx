import { useState } from 'react';
import { X } from 'lucide-react';
import { Card, CardContent } from './card';
import { Button } from './button';
import { Badge } from './badge';

interface FloatingAdProps {
  onUpgrade?: () => void;
  className?: string;
}

export function FloatingAd({ onUpgrade, className = '' }: FloatingAdProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <Card className={`bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 border-blue-200 dark:border-blue-800 shadow-lg ${className}`}>
      <CardContent className="p-4 relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-background shadow-sm"
          onClick={() => setIsVisible(false)}
        >
          <X className="w-3 h-3" />
        </Button>
        
        <div className="space-y-3">
          <Badge variant="outline" className="text-xs">
            Premium Feature
          </Badge>
          
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Smart Parking Insights</h4>
            <p className="text-xs text-muted-foreground">
              Get 24-hour forecasts and never circle for parking again
            </p>
          </div>
          
          <Button 
            size="sm" 
            className="w-full text-xs"
            onClick={onUpgrade}
          >
            Upgrade for $1.99/month
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}