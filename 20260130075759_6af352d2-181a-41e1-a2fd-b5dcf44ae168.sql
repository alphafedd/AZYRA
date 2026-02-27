-- Drop overly permissive policies
DROP POLICY IF EXISTS "System can insert wallets" ON public.wallets;
DROP POLICY IF EXISTS "System can insert subscriptions" ON public.subscriptions;

-- Create proper policies - users can only insert their own wallet/subscription
CREATE POLICY "Users can insert their own wallet" ON public.wallets
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription" ON public.subscriptions
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Update the trigger to use SECURITY DEFINER so it bypasses RLS
CREATE OR REPLACE FUNCTION public.handle_new_user_alc()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.wallets (user_id, alpha_coins)
  VALUES (NEW.id, 50)
  ON CONFLICT (user_id) DO NOTHING;
  
  INSERT INTO public.subscriptions (user_id, plan, questions_limit)
  VALUES (NEW.id, 'free', 25)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;