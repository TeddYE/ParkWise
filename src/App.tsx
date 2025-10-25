import { Header } from "./components/Header";
import { MapView } from "./components/MapView";
import { SearchView } from "./components/SearchView";
import { CarparkDetails } from "./components/CarparkDetails";
import { PremiumFeatures } from "./components/PremiumFeatures";
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
import { AppProviders } from "./contexts";
import { User } from "./types";

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

  const isPremium = user?.subscription === "premium";

  const handleSignOut = () => {
    signOut();
    handleViewChange("map");
    toast.info("Signed out successfully", {
      description:
        "You can still use free features without an account.",
      dismissible: true,
      closeButton: true,
    });
  };

  const handleSubscribe = () => {
    if (!user) {
      handleViewChange("signup");
    } else {
      handleViewChange("payment");
    }
  };

  const handleDowngrade = () => {
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
  };

  const handleLoginSuccess = (authUser: User) => {
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
  };

  const handleSignupSuccess = (authUser: User) => {
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
  };

  const handlePaymentSuccess = (authUser: User) => {
    updateUser(authUser);
    handleViewChange("map"); // Always show map after successful payment
    toast.success("Payment Successful! 🎊", {
      description:
        "You now have premium access to all features.",
    });
  };

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
          />
        )}

        {currentView === "search" && (
          <SearchView
            onSelectCarpark={handleSelectCarpark}
            onViewChange={handleViewChange}
            isPremium={isPremium}
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

        {currentView === "premium" && (
          <PremiumFeatures
            isPremium={isPremium}
            onViewChange={handleViewChange}
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