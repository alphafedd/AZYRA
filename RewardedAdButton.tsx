import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Coins, Clock, Loader2, Gift, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAds, formatTime } from "@/hooks/useAds";

interface RewardedAdButtonProps {
  variant?: "default" | "compact" | "large" | "timer";
  className?: string;
}

const AD_DURATION = 5; // seconds for simulated ad

export const RewardedAdButton = ({ variant = "default", className = "" }: RewardedAdButtonProps) => {
  const { adState, watchRewardedAd, MAX_REWARDED_ADS_PER_DAY, REWARDED_AD_ALC } = useAds();
  const [isWatching, setIsWatching] = useState(false);
  const [showAdModal, setShowAdModal] = useState(false);
  const [countdown, setCountdown] = useState(AD_DURATION);

  const handleWatchAd = async () => {
    if (!adState.canWatchRewardedAd || isWatching) return;
    
    setIsWatching(true);
    setShowAdModal(true);
    setCountdown(AD_DURATION);

    // Countdown timer
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Wait for ad to complete and credit ALC
    await watchRewardedAd();
    
    clearInterval(timer);
    setIsWatching(false);
    setShowAdModal(false);
  };

  const remainingAds = MAX_REWARDED_ADS_PER_DAY - adState.rewardedAdsWatchedToday;

  // Timer variant - shows countdown prominently
  if (variant === "timer") {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {adState.canWatchRewardedAd ? (
          <Button
            onClick={handleWatchAd}
            disabled={isWatching}
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground gap-2 animate-pulse-gold"
          >
            {isWatching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Gift className="w-4 h-4" />
                <span>Regarder une pub (+{REWARDED_AD_ALC} ALC)</span>
              </>
            )}
          </Button>
        ) : adState.timeUntilNextAd > 0 ? (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-border">
            <Timer className="w-5 h-5 text-primary" />
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Prochaine pub dans</span>
              <span className="text-lg font-mono font-bold text-foreground">
                {formatTime(adState.timeUntilNextAd)}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span className="text-sm">Limite atteinte ({remainingAds}/{MAX_REWARDED_ADS_PER_DAY})</span>
          </div>
        )}
        <AdModal 
          isOpen={showAdModal} 
          countdown={countdown} 
          onClose={() => setShowAdModal(false)} 
        />
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <>
        <Button
          onClick={handleWatchAd}
          disabled={!adState.canWatchRewardedAd || isWatching}
          size="sm"
          className={`bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground gap-1.5 ${className}`}
        >
          {isWatching ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : adState.canWatchRewardedAd ? (
            <>
              <Play className="w-3 h-3" />
              <span>+10 ALC</span>
            </>
          ) : adState.timeUntilNextAd > 0 ? (
            <>
              <Clock className="w-3 h-3" />
              <span className="font-mono">{formatTime(adState.timeUntilNextAd)}</span>
            </>
          ) : (
            <span>Limite</span>
          )}
        </Button>
        <AdModal 
          isOpen={showAdModal} 
          countdown={countdown} 
          onClose={() => setShowAdModal(false)} 
        />
      </>
    );
  }

  if (variant === "large") {
    return (
      <>
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/30 rounded-xl p-6 ${className}`}
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-primary to-primary/60 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(212,165,32,0.4)]">
              <Gift className="w-7 h-7 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg text-foreground">Gagnez des ALC gratuits!</h3>
              <p className="text-sm text-muted-foreground">
                Regardez une courte pub et recevez {REWARDED_AD_ALC} ALC
              </p>
              {remainingAds > 0 && (
                <p className="text-xs text-primary mt-1">
                  {remainingAds} pub{remainingAds > 1 ? 's' : ''} restante{remainingAds > 1 ? 's' : ''} aujourd'hui
                </p>
              )}
            </div>
            <Button
              onClick={handleWatchAd}
              disabled={!adState.canWatchRewardedAd || isWatching}
              className="bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 min-w-32 shadow-[0_0_15px_rgba(212,165,32,0.3)]"
            >
              {isWatching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : !adState.canWatchRewardedAd ? (
                adState.timeUntilNextAd > 0 ? (
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    {formatTime(adState.timeUntilNextAd)}
                  </span>
                ) : (
                  "Limite atteinte"
                )
              ) : (
                <span className="flex items-center gap-1.5">
                  <Play className="w-4 h-4" />
                  Regarder
                </span>
              )}
            </Button>
          </div>
        </motion.div>
        <AdModal 
          isOpen={showAdModal} 
          countdown={countdown} 
          onClose={() => setShowAdModal(false)} 
        />
      </>
    );
  }

  // Default variant
  return (
    <>
      <Button
        onClick={handleWatchAd}
        disabled={!adState.canWatchRewardedAd || isWatching}
        className={`bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 gap-2 shadow-[0_0_15px_rgba(212,165,32,0.3)] ${className}`}
      >
        {isWatching ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Chargement...</span>
          </>
        ) : !adState.canWatchRewardedAd ? (
          adState.timeUntilNextAd > 0 ? (
            <>
              <Clock className="w-4 h-4" />
              <span>Disponible dans {formatTime(adState.timeUntilNextAd)}</span>
            </>
          ) : (
            <>
              <Coins className="w-4 h-4" />
              <span>Limite atteinte ({MAX_REWARDED_ADS_PER_DAY}/jour)</span>
            </>
          )
        ) : (
          <>
            <Play className="w-4 h-4" />
            <Coins className="w-4 h-4" />
            <span>Regarder une pub (+{REWARDED_AD_ALC} ALC)</span>
          </>
        )}
      </Button>
      <AdModal 
        isOpen={showAdModal} 
        countdown={countdown} 
        onClose={() => setShowAdModal(false)} 
      />
    </>
  );
};

// Ad viewing modal with AdSense integration
const AdModal = ({ isOpen, countdown, onClose }: { isOpen: boolean; countdown: number; onClose: () => void }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-card border border-primary/20 rounded-2xl w-full max-w-lg overflow-hidden shadow-[0_0_50px_rgba(212,165,32,0.2)]"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary/20 to-primary/10 p-4 flex items-center justify-between border-b border-primary/20">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-primary" />
                <span className="font-bold text-foreground">Pub récompensée - +10 ALC</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-mono font-bold">{countdown}s</span>
              </div>
            </div>

            {/* Ad Content Area - Google AdSense Integration */}
            <div className="p-8">
              <div className="bg-black/30 border border-dashed border-primary/30 rounded-xl h-64 flex flex-col items-center justify-center gap-4">
                {/* AdSense ad slot placeholder */}
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/60 rounded-xl flex items-center justify-center animate-pulse shadow-[0_0_30px_rgba(212,165,32,0.5)]">
                  <Play className="w-8 h-8 text-primary-foreground" />
                </div>
                <p className="text-muted-foreground text-center px-4">
                  Publicité en cours...<br />
                  <span className="text-xs text-primary/60">(Google AdSense - ca-pub-4825177288549474)</span>
                </p>
                
                {/* Progress bar */}
                <div className="w-48 h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary to-primary/60"
                    initial={{ width: "0%" }}
                    animate={{ width: `${((AD_DURATION - countdown) / AD_DURATION) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-primary/20 text-center">
              <p className="text-sm text-muted-foreground">
                {countdown > 0 
                  ? "Regardez la pub pour recevoir vos 10 ALC..." 
                  : "✨ Traitement de votre récompense..."}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default RewardedAdButton;
