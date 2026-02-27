import { motion } from "framer-motion";
import { MessageSquare, Coins, Zap, Clock, Play, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAds, formatTime } from "@/hooks/useAds";

interface QuotaDisplayProps {
  questionsToday: number;
  questionsLimit: number;
  alphaCoins: number;
  plan: string;
}

const QuotaDisplay = ({ questionsToday, questionsLimit, alphaCoins, plan }: QuotaDisplayProps) => {
  const questionsRemaining = Math.max(0, questionsLimit - questionsToday);
  const progressPercent = questionsLimit > 0 ? (questionsToday / questionsLimit) * 100 : 0;
  const { adState, watchRewardedAd } = useAds();

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 px-3 py-2 rounded-xl bg-card/80 border border-border backdrop-blur-sm"
    >
      {/* Questions remaining */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <MessageSquare className="w-4 h-4 text-primary" />
          {questionsRemaining <= 5 && questionsRemaining > 0 && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full animate-pulse" />
          )}
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-foreground">Questions</span>
          <span className={`text-xs font-bold ${questionsRemaining === 0 ? 'text-destructive' : 'text-foreground'}`}>
            {questionsRemaining}/{questionsLimit}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-border" />

      {/* ALC Balance */}
      <div className="flex items-center gap-2">
        <Coins className="w-4 h-4 text-primary" />
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-foreground">ALC</span>
          <span className="text-xs font-bold text-foreground">{alphaCoins}</span>
        </div>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-border" />

      {/* Timer / Rewarded Ad Button */}
      <div className="flex items-center">
        {adState.canWatchRewardedAd ? (
          <Button
            size="sm"
            onClick={watchRewardedAd}
            className="h-7 px-2 text-xs bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground gap-1 animate-pulse-gold"
          >
            <Gift className="w-3 h-3" />
            <span>+10 ALC</span>
          </Button>
        ) : adState.timeUntilNextAd > 0 ? (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50">
            <Clock className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] font-mono text-muted-foreground">
              {formatTime(adState.timeUntilNextAd)}
            </span>
          </div>
        ) : null}
      </div>

      {/* Plan badge */}
      <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 border border-primary/20">
        <Zap className="w-3 h-3 text-primary" />
        <span className="text-[10px] font-bold text-primary uppercase">{plan}</span>
      </div>
    </motion.div>
  );
};

export default QuotaDisplay;
