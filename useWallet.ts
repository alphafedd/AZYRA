import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface Wallet {
  id: string;
  user_id: string;
  alpha_coins: number;
  total_earned: number;
  total_spent: number;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan: 'free' | 'plus' | 'premium' | 'vip';
  questions_today: number;
  questions_limit: number;
  last_question_reset: string;
  expires_at: string | null;
}

export interface Transaction {
  id: string;
  type: string;
  amount: number;
  balance_after: number;
  description: string | null;
  status: string;
  created_at: string;
}

export const useWallet = () => {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const loadWallet = useCallback(async () => {
    if (!user) {
      setWallet(null);
      setSubscription(null);
      setTransactions([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (walletError) {
        console.error('Error loading wallet:', walletError);
      }

      // Auto-create wallet if missing (e.g., older users or missing trigger)
      let resolvedWallet = (walletData as Wallet | null) ?? null;
      if (!resolvedWallet) {
        const { data: createdWallet, error: createWalletError } = await supabase
          .from('wallets')
          .insert({
            user_id: user.id,
            // Match our intended welcome bonus
            alpha_coins: 50,
            total_earned: 0,
            total_spent: 0,
          })
          .select('*')
          .single();

        if (createWalletError) {
          console.error('Error creating wallet:', createWalletError);
        } else {
          resolvedWallet = createdWallet as Wallet;
        }
      }

      if (resolvedWallet) setWallet(resolvedWallet);

      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (subError) {
        console.error('Error loading subscription:', subError);
      }

      // Auto-create subscription if missing
      let resolvedSub = (subData as Subscription | null) ?? null;
      if (!resolvedSub) {
        const today = new Date().toISOString().split('T')[0];
        const { data: createdSub, error: createSubError } = await supabase
          .from('subscriptions')
          .insert({
            user_id: user.id,
            plan: 'free',
            questions_limit: 25,
            questions_today: 0,
            last_question_reset: today,
          })
          .select('*')
          .single();

        if (createSubError) {
          console.error('Error creating subscription:', createSubError);
        } else {
          resolvedSub = createdSub as Subscription;
        }
      }

      if (resolvedSub) setSubscription(resolvedSub);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadTransactions = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('alc_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTransactions((data || []) as Transaction[]);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  }, [user]);

  const spendALC = useCallback(async (amount: number, description: string): Promise<boolean> => {
    if (!user || !wallet) return false;
    if (wallet.alpha_coins < amount) return false;

    try {
      const newBalance = wallet.alpha_coins - amount;

      const { error: transactionError } = await supabase
        .from('alc_transactions')
        .insert({
          user_id: user.id,
          type: 'usage',
          amount: -amount,
          balance_after: newBalance,
          description,
          status: 'auto_approved'
        });

      if (transactionError) throw transactionError;

      const { error: walletError } = await supabase
        .from('wallets')
        .update({ 
          alpha_coins: newBalance,
          total_spent: wallet.total_spent + amount 
        })
        .eq('user_id', user.id);

      if (walletError) throw walletError;

      setWallet(prev => prev ? { ...prev, alpha_coins: newBalance, total_spent: prev.total_spent + amount } : null);
      return true;
    } catch (error) {
      console.error('Error spending ALC:', error);
      return false;
    }
  }, [user, wallet]);

  const addALC = useCallback(async (
    amount: number, 
    type: 'purchase' | 'reward' | 'coupon' | 'admin_credit',
    description: string,
    transactionId?: string,
    paymentMethod?: string,
    proofUrl?: string
  ): Promise<boolean> => {
    if (!user || !wallet) return false;

    try {
      const newBalance = wallet.alpha_coins + amount;

      const { error: transactionError } = await supabase
        .from('alc_transactions')
        .insert({
          user_id: user.id,
          type: type as 'purchase' | 'reward' | 'transfer' | 'admin_credit' | 'admin_debit' | 'coupon' | 'usage',
          amount,
          balance_after: newBalance,
          description,
          transaction_id: transactionId,
          payment_method: paymentMethod as 'natcash' | 'moncash' | 'paypal' | 'card' | 'binance' | undefined,
          proof_url: proofUrl,
          status: 'auto_approved' as const
        });

      if (transactionError) throw transactionError;

      const { error: walletError } = await supabase
        .from('wallets')
        .update({ 
          alpha_coins: newBalance,
          total_earned: wallet.total_earned + amount 
        })
        .eq('user_id', user.id);

      if (walletError) throw walletError;

      setWallet(prev => prev ? { ...prev, alpha_coins: newBalance, total_earned: prev.total_earned + amount } : null);
      return true;
    } catch (error) {
      console.error('Error adding ALC:', error);
      return false;
    }
  }, [user, wallet]);

  const redeemCoupon = useCallback(async (code: string): Promise<{ success: boolean; message: string }> => {
    if (!user) return { success: false, message: 'Non connecté' };

    try {
      // Check if coupon exists and is valid
      const { data: coupon, error: couponError } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .single();

      if (couponError || !coupon) {
        return { success: false, message: 'Coupon invalide ou expiré' };
      }

      // Check expiration
      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        return { success: false, message: 'Ce coupon a expiré' };
      }

      // Check max uses
      if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
        return { success: false, message: 'Ce coupon a atteint sa limite d\'utilisation' };
      }

      // Check if already used by this user
      const { data: existingUse } = await supabase
        .from('coupon_uses')
        .select('id')
        .eq('coupon_id', coupon.id)
        .eq('user_id', user.id)
        .single();

      if (existingUse) {
        return { success: false, message: 'Vous avez déjà utilisé ce coupon' };
      }

      // Use the coupon
      const { error: useError } = await supabase
        .from('coupon_uses')
        .insert({ coupon_id: coupon.id, user_id: user.id });

      if (useError) throw useError;

      // Update coupon usage count
      await supabase
        .from('coupons')
        .update({ current_uses: coupon.current_uses + 1 })
        .eq('id', coupon.id);

      // Add ALC to wallet
      const success = await addALC(
        coupon.alc_value, 
        'coupon', 
        `Coupon ${code.toUpperCase()}`
      );

      if (success) {
        return { success: true, message: `${coupon.alc_value} ALC ajoutés à votre compte !` };
      } else {
        return { success: false, message: 'Erreur lors de l\'ajout des ALC' };
      }
    } catch (error) {
      console.error('Error redeeming coupon:', error);
      return { success: false, message: 'Erreur lors de l\'utilisation du coupon' };
    }
  }, [user, addALC]);

  const canAskQuestion = useCallback((): boolean => {
    if (!subscription) return false;
    if (subscription.plan === 'premium' || subscription.plan === 'vip') return true;
    return subscription.questions_today < subscription.questions_limit;
  }, [subscription]);

  const incrementQuestionCount = useCallback(async (): Promise<boolean> => {
    if (!user || !subscription) return false;

    try {
      const today = new Date().toISOString().split('T')[0];
      const lastReset = subscription.last_question_reset;

      let newQuestionsToday = subscription.questions_today + 1;
      
      // Reset if new day
      if (lastReset !== today) {
        newQuestionsToday = 1;
      }

      const { error } = await supabase
        .from('subscriptions')
        .update({ 
          questions_today: newQuestionsToday,
          last_question_reset: today
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setSubscription(prev => prev ? { 
        ...prev, 
        questions_today: newQuestionsToday,
        last_question_reset: today
      } : null);

      return true;
    } catch (error) {
      console.error('Error incrementing question count:', error);
      return false;
    }
  }, [user, subscription]);

  // Realtime subscription for wallet updates
  useEffect(() => {
    loadWallet();
    loadTransactions();
  }, [loadWallet, loadTransactions]);

  // Set up realtime subscriptions
  useEffect(() => {
    if (!user) return;

    // Subscribe to wallet changes
    const walletChannel: RealtimeChannel = supabase
      .channel(`wallet-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Wallet realtime update:', payload);
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            setWallet(payload.new as Wallet);
          }
        }
      )
      .subscribe();

    // Subscribe to subscription changes
    const subChannel: RealtimeChannel = supabase
      .channel(`subscription-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Subscription realtime update:', payload);
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            setSubscription(payload.new as Subscription);
          }
        }
      )
      .subscribe();

    // Subscribe to transaction changes for live history
    const txChannel: RealtimeChannel = supabase
      .channel(`transactions-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alc_transactions',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Transaction realtime insert:', payload);
          setTransactions(prev => [payload.new as Transaction, ...prev].slice(0, 50));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(walletChannel);
      supabase.removeChannel(subChannel);
      supabase.removeChannel(txChannel);
    };
  }, [user]);

  return {
    wallet,
    subscription,
    transactions,
    loading,
    loadWallet,
    loadTransactions,
    spendALC,
    addALC,
    redeemCoupon,
    canAskQuestion,
    incrementQuestionCount
  };
};
