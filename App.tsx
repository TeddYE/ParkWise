import { useState } from 'react';
import { Header } from './components/Header';
import { MapView } from './components/MapView';
import { SearchView } from './components/SearchView';
import { CarparkDetails } from './components/CarparkDetails';
import { PremiumFeatures } from './components/PremiumFeatures';
import { PricingView } from './components/PricingView';
import { NavigationView } from './components/NavigationView';
import { Carpark, ViewType } from './types';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>('map');
  const [selectedCarpark, setSelectedCarpark] = useState<Carpark | null>(null);
  const [isPremium, setIsPremium] = useState(false);

  const handleViewChange = (view: ViewType) => {
    setCurrentView(view);
  };

  const handleSelectCarpark = (carpark: Carpark) => {
    setSelectedCarpark(carpark);
    setCurrentView('details');
  };

  const handleSubscribe = () => {
    setIsPremium(true);
    setCurrentView('premium');
  };

  const handleBackToMap = () => {
    setSelectedCarpark(null);
    setCurrentView('map');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        currentView={currentView} 
        onViewChange={handleViewChange}
        isPremium={isPremium}
      />
      
      <main className="h-[calc(100vh-64px)]">
        {currentView === 'map' && (
          <MapView 
            onViewChange={handleViewChange}
            onSelectCarpark={handleSelectCarpark}
            isPremium={isPremium}
          />
        )}
        
        {currentView === 'search' && (
          <SearchView 
            onSelectCarpark={handleSelectCarpark}
            onViewChange={handleViewChange}
            isPremium={isPremium}
          />
        )}
        
        {currentView === 'details' && selectedCarpark && (
          <CarparkDetails 
            carpark={selectedCarpark}
            onBack={handleBackToMap}
            onViewChange={handleViewChange}
            isPremium={isPremium}
          />
        )}
        
        {currentView === 'premium' && (
          <PremiumFeatures 
            isPremium={isPremium}
            onViewChange={handleViewChange}
          />
        )}
        
        {currentView === 'pricing' && (
          <PricingView 
            isPremium={isPremium}
            onSubscribe={handleSubscribe}
            onViewChange={handleViewChange}
          />
        )}
        
        {currentView === 'navigation' && selectedCarpark && (
          <NavigationView 
            carpark={selectedCarpark}
            onBack={() => setCurrentView('details')}
          />
        )}
      </main>
    </div>
  );
}