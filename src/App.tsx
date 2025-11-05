import { Header } from "./components/Header";
import { MapView } from "./components/MapView";
import { SearchView } from "./components/SearchView";
import { CarparkDetails } from "./components/CarparkDetails";

import { PricingView } from "./components/PricingView";
import { LoginView } from "./components/LoginView";
import { SignupView } from "./components/SignupView";
import { PaymentView } from "./components/PaymentView";
import { ProfileView } from "./components/ProfileView";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";
import { useAuth } from "./hooks/useAuth";
import { useAppState } from "./hooks/useAppState";
import { useDarkMode } from "./hooks/useDarkMode";
import { useCarparks } from "./hooks/useCarparks";
import { useDrivingTimes } from "./hooks/useDrivingTimes";
import { AppProviders } from "./contexts";
import { User } from "./types";
import { memo, useCallback, useMemo, useState, useEffect } from "react";

function AppContent() {
  const {
    currentView,
    selectedCarpark,
    selectedPlan,
    handleViewChange,
    handleSelectCarpark,
    handleBackToMap,
    handlePlanChange,
  } = useAppState();
  
  const {
    user,
    isAuthenticated,
    loading,
    signOut,
    updateUser,
  } = useAuth();
  
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  // Simplified location state - no persistence, no continuous tracking
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  // Shared carparks data
  const { carparks: apiCarparks, loading: isLoadingCarparks, refetch: refetchCarparks } = useCarparks();

  // Shared driving times calculation
  const { carparks: carparksWithDrivingTimes, isLoading: isLoadingDrivingTimes } = useDrivingTimes({
    carparks: apiCarparks,
    userLocation,
    enableRealTimes: true,
  });

  // Debug when carparks with driving times change
  useEffect(() => {
    if (carparksWithDrivingTimes.length > 0) {
      console.log('🏁 App received updated carparks:', carparksWithDrivingTimes.length);
      console.log('🏁 Sample carpark with driving times:', {
        id: carparksWithDrivingTimes[0].id,
        distance: carparksWithDrivingTimes[0].distance,
        drivingTime: carparksWithDrivingTimes[0].drivingTime
      });
    }
  }, [carparksWithDrivingTimes]);

  const isPremium = useMemo(() => user?.subscription === "premium", [user?.subscription]);

  // Automatically request location on app startup
  useEffect(() => {
    getUserLocation();
  }, []); // Run once on mount

  // Simple location function - get location once
  const getUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser');
      return;
    }

    setIsLoadingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        
        setUserLocation(location);
        setIsLoadingLocation(false);
        toast.success('Location enabled', {
          description: 'Now showing distances and driving times',
          duration: 2000,
        });
      },
      (error) => {
        console.error('Location access denied or unavailable:', error);
        setIsLoadingLocation(false);
        
        // For testing purposes, use a default Singapore location
        const defaultLocation = {
          lat: 1.3521, // Singapore city center
          lng: 103.8198
        };
        
        setUserLocation(defaultLocation);
        toast.info('Using default location', {
          description: 'Using Singapore city center for distance calculations',
          duration: 3000,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  }, []);



  const handleSignOut = useCallback(() => {
    signOut();
    handleViewChange("map");
    toast.info("Signed out successfully", {
      description:
        "You can still use free features without an account.",
      dismissible: true,
      closeButton: true,
    });
  }, [signOut, handleViewChange]);

  const handleSubscribe = useCallback(() => {
    if (!user) {
      handleViewChange("signup");
    } else {
      handleViewChange("payment");
    }
  }, [user, handleViewChange]);

  const handleDowngrade = useCallback(() => {
    if (!user) return;

    // Mock downgrade
    updateUser({
      ...user,
      subscription: "free",
      subscriptionExpiry: undefined,
    });

    toast.info("Downgraded to Free Plan", {
      description: "Premium features are no longer available.",
    });
  }, [user, updateUser]);

  const handleLoginSuccess = useCallback((authUser: User) => {
    updateUser(authUser);
    handleViewChange("map"); // Always show map after login
    toast.success(`Welcome back, ${authUser.user_id}! 🎉`, {
      description:
        authUser.subscription === "premium"
          ? "You have premium access to all features."
          : "Enjoy free features. Upgrade to premium for more!",
      dismissible: true,
      closeButton: true,
    });
  }, [updateUser, handleViewChange]);

  const handleSignupSuccess = useCallback((authUser: User) => {
    updateUser(authUser);
    // If user has free subscription, go to map. Otherwise go to payment.
    if (authUser.subscription === "free") {
      handleViewChange("map");
      toast.success(
        `Welcome to ParkWise, ${authUser.user_id}! 🎉`,
        {
          description:
            "Account created successfully. Upgrade anytime for premium features!",
        },
      );
    } else {
      handleViewChange("payment");
    }
  }, [updateUser, handleViewChange]);

  const handlePaymentSuccess = useCallback((authUser: User) => {
    updateUser(authUser);
    handleViewChange("map"); // Always show map after successful payment
    toast.success("Payment Successful! 🎊", {
      description:
        "You now have premium access to all features.",
    });
  }, [updateUser, handleViewChange]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-background flex flex-col">
      <Toaster position="top-right" richColors />
      <Header
        currentView={currentView}
        onViewChange={handleViewChange}
        onBackToHome={handleBackToMap}
        isPremium={isPremium}
        user={user}
        onSignOut={handleSignOut}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
      />

      <main className="flex-1 overflow-hidden relative z-0">
        {currentView === "map" && (
          <MapView
            onViewChange={handleViewChange}
            onSelectCarpark={handleSelectCarpark}
            isPremium={isPremium}
            user={user}
            onUpdateUser={updateUser}
            userLocation={userLocation}
            onGetUserLocation={getUserLocation}
            isLoadingLocation={isLoadingLocation}
            carparks={carparksWithDrivingTimes}
            isLoadingCarparks={isLoadingCarparks}
            onRefreshCarparks={refetchCarparks}
          />
        )}

        {currentView === "search" && (
          <SearchView
            onSelectCarpark={handleSelectCarpark}
            onViewChange={handleViewChange}
            isPremium={isPremium}
            user={user || undefined}
            userLocation={userLocation}
            onGetUserLocation={getUserLocation}
            isLoadingLocation={isLoadingLocation}
            carparks={carparksWithDrivingTimes}
            isLoadingCarparks={isLoadingCarparks}
          />
        )}

        {currentView === "details" && selectedCarpark && (
          <CarparkDetails
            carpark={selectedCarpark}
            onBack={handleBackToMap}
            onViewChange={handleViewChange}
            isPremium={isPremium}
            user={user || undefined}
            onUpdateUser={updateUser}
          />
        )}



        {currentView === "pricing" && (
          <PricingView
            isPremium={isPremium}
            onSubscribe={handleSubscribe}
            onViewChange={handleViewChange}
            user={user}
            onDowngrade={handleDowngrade}
            selectedPlan={selectedPlan}
            onPlanChange={handlePlanChange}
          />
        )}

        {currentView === "login" && (
          <LoginView
            onViewChange={handleViewChange}
            onLoginSuccess={handleLoginSuccess}
          />
        )}

        {currentView === "signup" && (
          <SignupView
            onViewChange={handleViewChange}
            onSignupSuccess={handleSignupSuccess}
          />
        )}

        {currentView === "payment" && (
          <PaymentView
            onViewChange={handleViewChange}
            onPaymentSuccess={handlePaymentSuccess}
            user={user}
            planType={selectedPlan}
          />
        )}

        {currentView === "profile" && user && (
          <ProfileView
            user={user}
            onViewChange={handleViewChange}
            onUpdateUser={updateUser}
            onSelectCarpark={handleSelectCarpark}
            isPremium={isPremium}
          />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AppProviders>
      <AppContent />
    </AppProviders>
  );
}