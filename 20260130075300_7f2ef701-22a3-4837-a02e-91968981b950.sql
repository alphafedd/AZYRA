-- Créer les enums nécessaires
CREATE TYPE public.subscription_plan AS ENUM ('free', 'plus', 'premium', 'vip');
CREATE TYPE public.transaction_type AS ENUM ('purchase', 'reward', 'transfer', 'admin_credit', 'admin_debit', 'coupon', 'usage');
CREATE TYPE public.transaction_status AS ENUM ('pending', 'auto_approved', 'approved', 'rejected', 'failed');
CREATE TYPE public.payment_method AS ENUM ('natcash', 'moncash', 'paypal', 'card', 'binance');

-- Table des portefeuilles ALC
CREATE TABLE public.wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    alpha_coins INTEGER NOT NULL DEFAULT 0,
    total_earned INTEGER NOT NULL DEFAULT 0,
    total_spent INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des abonnements
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    plan subscription_plan NOT NULL DEFAULT 'free',
    questions_today INTEGER NOT NULL DEFAULT 0,
    questions_limit INTEGER NOT NULL DEFAULT 25,
    last_question_reset DATE NOT NULL DEFAULT CURRENT_DATE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des transactions ALC
CREATE TABLE public.alc_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    type transaction_type NOT NULL,
    amount INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    description TEXT,
    transaction_id TEXT,
    payment_method payment_method,
    proof_url TEXT,
    status transaction_status NOT NULL DEFAULT 'pending',
    admin_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des coupons
CREATE TABLE public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    alc_value INTEGER NOT NULL,
    max_uses INTEGER,
    current_uses INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des utilisations de coupons
CREATE TABLE public.coupon_uses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(coupon_id, user_id)
);

-- Table des logs admin
CREATE TABLE public.admin_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL,
    action TEXT NOT NULL,
    target_user_id UUID,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des limites anti-fraude
CREATE TABLE public.daily_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    auto_credits_count INTEGER NOT NULL DEFAULT 0,
    ads_watched INTEGER NOT NULL DEFAULT 0,
    UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alc_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_uses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_limits ENABLE ROW LEVEL SECURITY;

-- Wallets policies
CREATE POLICY "Users can view their own wallet" ON public.wallets
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet" ON public.wallets
FOR UPDATE USING (auth.uid() = user_id);

-- Subscriptions policies
CREATE POLICY "Users can view their own subscription" ON public.subscriptions
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription" ON public.subscriptions
FOR UPDATE USING (auth.uid() = user_id);

-- Transactions policies
CREATE POLICY "Users can view their own transactions" ON public.alc_transactions
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create transactions" ON public.alc_transactions
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Coupons policies (everyone can view active coupons)
CREATE POLICY "Anyone can view active coupons" ON public.coupons
FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage coupons" ON public.coupons
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Coupon uses policies
CREATE POLICY "Users can view their coupon uses" ON public.coupon_uses
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can use coupons" ON public.coupon_uses
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin logs policies
CREATE POLICY "Only admins can view logs" ON public.admin_logs
FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can create logs" ON public.admin_logs
FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Daily limits policies
CREATE POLICY "Users can view their own limits" ON public.daily_limits
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own limits" ON public.daily_limits
FOR ALL USING (auth.uid() = user_id);

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_wallets_updated_at
BEFORE UPDATE ON public.wallets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Fonction pour créer wallet et subscription automatiquement
CREATE OR REPLACE FUNCTION public.handle_new_user_alc()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.wallets (user_id, alpha_coins)
  VALUES (NEW.id, 50);
  
  INSERT INTO public.subscriptions (user_id, plan, questions_limit)
  VALUES (NEW.id, 'free', 25);
  
  RETURN NEW;
END;
$$;

-- Trigger pour nouveaux utilisateurs
CREATE TRIGGER on_auth_user_created_alc
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_alc();