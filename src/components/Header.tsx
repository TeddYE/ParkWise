import { MapPin, Search, Settings, Crown, User, LogOut, Moon, Sun, Menu } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from './ui/sheet';
import { useState } from 'react';

interface HeaderProps {
  currentView: string;
  onViewChange: (view: string) => void;
  onBackToHome: () => void;
  isPremium: boolean;
  user?: any;
  onSignOut?: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export function Header({ currentView, onViewChange, onBackToHome, isPremium, user, onSignOut, isDarkMode, onToggleDarkMode }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavigation = (view: string) => {
    onViewChange(view);
    setMobileMenuOpen(false);
  };

  return (
    <header className="bg-background border-b px-4 py-3 flex items-center justify-between relative z-[100]">
      <div className="flex items-center gap-3">
        <button 
          onClick={onBackToHome} 
          className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
          aria-label="Go to home page"
        >
          <MapPin className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-semibold text-primary">ParkWise</h1>
        </button>
        {isPremium && (
          <>
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200 hidden sm:flex">
              <Crown className="w-3 h-3 mr-1" />
              Premium
            </Badge>
            <Crown className="w-4 h-4 text-yellow-600 sm:hidden" />
          </>
        )}
      </div>

      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center gap-2">
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

        {/* Plans Tab - Always visible */}
        <Button
          variant={currentView === 'pricing' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onViewChange('pricing')}
          className="flex items-center gap-2"
        >
          <Crown className="w-4 h-4" />
          Plans
        </Button>

        {/* Dark Mode Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleDarkMode}
          className="flex items-center gap-2"
          aria-label="Toggle dark mode"
        >
          {isDarkMode ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </Button>

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="User menu"
              >
                <User className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onViewChange('profile')}>
                <User className="w-4 h-4 mr-2" />
                My Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewChange('pricing')}>
                <Settings className="w-4 h-4 mr-2" />
                Plans & Billing
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            variant={currentView === 'login' || currentView === 'signup' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('login')}
            className="flex items-center gap-2"
          >
            <User className="w-4 h-4" />
            Login
          </Button>
        )}
      </nav>

      {/* Mobile Navigation */}
      <div className="flex md:hidden items-center gap-2">
        {/* Dark Mode Toggle - Always visible */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleDarkMode}
          aria-label="Toggle dark mode"
        >
          {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>

        {/* Mobile Menu */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open menu">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-64">
            <SheetHeader className="pt-27">
              <SheetTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                ParkWise
                {isPremium && (
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs">
                    <Crown className="w-3 h-3 mr-1" />
                    Premium
                  </Badge>
                )}
              </SheetTitle>
              <SheetDescription>
                Navigate to different sections of the app
              </SheetDescription>
            </SheetHeader>
            
            <div className="flex flex-col gap-2 mt-6">
              <Button
                variant={currentView === 'map' ? 'default' : 'ghost'}
                onClick={() => handleNavigation('map')}
                className="w-full justify-start"
              >
                <MapPin className="w-4 h-4 mr-2" />
                Map
              </Button>
              
              <Button
                variant={currentView === 'search' ? 'default' : 'ghost'}
                onClick={() => handleNavigation('search')}
                className="w-full justify-start"
              >
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>

              {isPremium && (
                <Button
                  variant={currentView === 'premium' ? 'default' : 'ghost'}
                  onClick={() => handleNavigation('premium')}
                  className="w-full justify-start"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Premium
                </Button>
              )}

              <Button
                variant={currentView === 'pricing' ? 'default' : 'ghost'}
                onClick={() => handleNavigation('pricing')}
                className="w-full justify-start"
              >
                <Crown className="w-4 h-4 mr-2" />
                Plans
              </Button>

              <div className="border-t my-2" />

              {user ? (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => handleNavigation('profile')}
                    className="w-full justify-start"
                  >
                    <User className="w-4 h-4 mr-2" />
                    My Profile
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => handleNavigation('pricing')}
                    className="w-full justify-start"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Plans & Billing
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      onSignOut?.();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </>
              ) : (
                <Button
                  variant={currentView === 'login' || currentView === 'signup' ? 'default' : 'ghost'}
                  onClick={() => handleNavigation('login')}
                  className="w-full justify-start"
                >
                  <User className="w-4 h-4 mr-2" />
                  Login
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
