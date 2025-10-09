import { MapPin, Search, Settings, Crown, User } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface HeaderProps {
  currentView: string;
  onViewChange: (view: string) => void;
  isPremium: boolean;
}

export function Header({ currentView, onViewChange, isPremium }: HeaderProps) {
  return (
    <header className="bg-background border-b px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-semibold text-primary">ParkWise</h1>
        </div>
        {isPremium && (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Crown className="w-3 h-3 mr-1" />
            Premium
          </Badge>
        )}
      </div>

      <nav className="flex items-center gap-2">
        <Button
          variant={currentView === 'map' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onViewChange('map')}
          className="flex items-center gap-2"
        >
          <MapPin className="w-4 h-4" />
          Map
        </Button>
        
        <Button
          variant={currentView === 'search' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onViewChange('search')}
          className="flex items-center gap-2"
        >
          <Search className="w-4 h-4" />
          Search
        </Button>

        {isPremium && (
          <Button
            variant={currentView === 'premium' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('premium')}
            className="flex items-center gap-2"
          >
            <Crown className="w-4 h-4" />
            Premium
          </Button>
        )}

        <Button
          variant={currentView === 'pricing' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onViewChange('pricing')}
          className="flex items-center gap-2"
        >
          <User className="w-4 h-4" />
          Account
        </Button>
      </nav>
    </header>
  );
}