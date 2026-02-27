import { useState } from "react";
import ModernChat from "@/components/ModernChat";
import { useAuth } from "@/hooks/useAuth";
import AuthModal from "@/components/AuthModal";
import LandingPage from "@/components/LandingPage";
import alphaLogo from "@/assets/alpha-logo.png";

const Index = () => {
  const { user, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [showChat, setShowChat] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6">
        <div className="w-20 h-20 rounded-2xl overflow-hidden border border-border shadow-lg">
          <img src={alphaLogo} alt="Azyra-AI" className="w-full h-full object-cover" />
        </div>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
        <p className="text-muted-foreground text-sm">Chargement d'Azyra-AI...</p>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        {showAuth ? (
          <AuthModal onClose={() => setShowAuth(false)} showCloseButton />
        ) : (
          <LandingPage onGetStarted={() => setShowAuth(true)} />
        )}
      </div>
    );
  }

  // Authenticated
  return (
    <div className="min-h-screen bg-background">
      {showChat ? (
        <ModernChat onBackToHome={() => setShowChat(false)} />
      ) : (
        <LandingPage onGetStarted={() => setShowChat(true)} />
      )}
    </div>
  );
};

export default Index;
