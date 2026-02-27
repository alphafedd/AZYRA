import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

// Constants - ALC costs
export const ALC_COSTS = {
  CHAT: 5,           // Simple chat costs 5 ALC
  IMAGE_GEN: 25,     // Image generation costs 25 ALC
  CODE: 45,          // Coding assistance costs 45 ALC
  VIDEO_GEN: 75,     // Video generation costs 75 ALC
};

const REWARDED_AD_INTERVAL = 180 * 60 * 1000; // 180 minutes in ms
const MAX_REWARDED_ADS_PER_DAY = 8;
const REWARDED_AD_ALC = 10;

// Storage key for timer persistence
const TIMER_STORAGE_KEY = 'alpha_ai_rewarded_ad_timer';

export interface AdState {
  showRewardedAdAvailable: boolean;
  canWatchRewardedAd: boolean;
  rewardedAdsWatchedToday: number;
  nextRewardedAdTime: Date | null;
  timeUntilNextAd: number; // in seconds
  loading: boolean;
}

// Get stored timer from localStorage
const getStoredTimer = (): number => {
  try {
    const stored = localStorage.getItem(TIMER_STORAGE_KEY);
    if (stored) {
      return parseInt(stored, 10);
    }
  } catch (e) {
    console.error('Error reading timer from storage:', e);
  }
  return 0;
};

// Save timer to localStorage
const saveTimer = (timestamp: number) => {
  try {
    localStorage.setItem(TIMER_STORAGE_KEY, timestamp.toString());
  } catch (e) {
    console.error('Error saving timer to storage:', e);
  }
};

export const useAds = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [adState, setAdState] = useState<AdState>({
    showRewardedAdAvailable: false,
    canWatchRewardedAd: false,
    rewardedAdsWatchedToday: 0,
    nextRewardedAdTime: null,
    timeUntilNextAd: 0,
    loading: true
  });

  const [lastRewardedAd, setLastRewardedAd] = useState<number>(getStoredTimer());

  // Load daily limits from database
  const loadDailyLimits = useCallback(async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('daily_limits')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading daily limits:', error);
        return;
      }

      if (data) {
        setAdState(prev => ({
          ...prev,
          rewardedAdsWatchedToday: data.ads_watched,
          loading: false
        }));
      } else {
        // Create today's entry
        await supabase
          .from('daily_limits')
          .insert({ user_id: user.id, date: today, ads_watched: 0 });
        
        setAdState(prev => ({
          ...prev,
          rewardedAdsWatchedToday: 0,
          loading: false
        }));
      }
    } catch (error) {
      console.error('Error:', error);
      setAdState(prev => ({ ...prev, loading: false }));
    }
  }, [user]);

  // Timer countdown effect - runs every second
  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      const timeSinceLastAd = now - lastRewardedAd;
      const timeRemaining = Math.max(0, REWARDED_AD_INTERVAL - timeSinceLastAd);
      const secondsRemaining = Math.ceil(timeRemaining / 1000);
      
      const canWatch = timeRemaining === 0 && 
                       adState.rewardedAdsWatchedToday < MAX_REWARDED_ADS_PER_DAY;
      
      let nextTime: Date | null = null;
      if (lastRewardedAd > 0 && timeRemaining > 0) {
        nextTime = new Date(lastRewardedAd + REWARDED_AD_INTERVAL);
      }

      setAdState(prev => ({
        ...prev,
        canWatchRewardedAd: canWatch,
        showRewardedAdAvailable: canWatch,
        nextRewardedAdTime: nextTime,
        timeUntilNextAd: secondsRemaining
      }));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [lastRewardedAd, adState.rewardedAdsWatchedToday]);

  useEffect(() => {
    loadDailyLimits();
  }, [loadDailyLimits]);

  // Watch a rewarded ad and earn ALC
  const watchRewardedAd = useCallback(async (): Promise<boolean> => {
    if (!user) {
      toast({ title: "Erreur", description: "Vous devez être connecté", variant: "destructive" });
      return false;
    }

    if (!adState.canWatchRewardedAd) {
      toast({ 
        title: "Limite atteinte", 
        description: adState.rewardedAdsWatchedToday >= MAX_REWARDED_ADS_PER_DAY 
          ? "Vous avez atteint la limite de 8 pubs par jour" 
          : `Attendez encore ${formatTime(adState.timeUntilNextAd)} avant la prochaine pub`,
        variant: "destructive" 
      });
      return false;
    }

    try {
      // Simulate watching ad (AdSense rewarded ad integration)
      // In production, this triggers actual AdSense rewarded ad
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Update daily limits
      const today = new Date().toISOString().split('T')[0];
      const newAdsWatched = adState.rewardedAdsWatchedToday + 1;

      await supabase
        .from('daily_limits')
        .upsert({
          user_id: user.id,
          date: today,
          ads_watched: newAdsWatched
        }, { onConflict: 'user_id,date' });

      // Get current wallet
      const { data: wallet } = await supabase
        .from('wallets')
        .select('alpha_coins, total_earned')
        .eq('user_id', user.id)
        .single();

      if (wallet) {
        const newBalance = wallet.alpha_coins + REWARDED_AD_ALC;

        // Add transaction
        await supabase
          .from('alc_transactions')
          .insert({
            user_id: user.id,
            type: 'reward' as const,
            amount: REWARDED_AD_ALC,
            balance_after: newBalance,
            description: 'Récompense pub visionnée (+10 ALC)',
            status: 'auto_approved' as const
          });

        // Update wallet
        await supabase
          .from('wallets')
          .update({ 
            alpha_coins: newBalance,
            total_earned: wallet.total_earned + REWARDED_AD_ALC 
          })
          .eq('user_id', user.id);
      }

      const newTimestamp = Date.now();
      setLastRewardedAd(newTimestamp);
      saveTimer(newTimestamp);
      
      setAdState(prev => ({
        ...prev,
        rewardedAdsWatchedToday: newAdsWatched,
        canWatchRewardedAd: false,
        showRewardedAdAvailable: false
      }));
      
      toast({ 
        title: "🎉 +10 ALC!", 
        description: "Merci d'avoir regardé la pub. Vos ALC ont été crédités!" 
      });
      
      return true;
    } catch (error) {
      console.error('Error watching rewarded ad:', error);
      toast({ title: "Erreur", description: "Une erreur est survenue", variant: "destructive" });
      return false;
    }
  }, [user, adState, toast]);

  return {
    adState,
    watchRewardedAd,
    MAX_REWARDED_ADS_PER_DAY,
    REWARDED_AD_ALC,
    ALC_COSTS
  };
};

// Helper function to format time
export const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
};
