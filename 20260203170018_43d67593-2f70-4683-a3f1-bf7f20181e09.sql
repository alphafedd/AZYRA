-- Allow admins to manage wallets for any user
CREATE POLICY "Admins can insert wallets for any user"
ON public.wallets FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update any wallet"
ON public.wallets FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all wallets"
ON public.wallets FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to manage subscriptions for any user
CREATE POLICY "Admins can insert subscriptions for any user"
ON public.subscriptions FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update any subscription"
ON public.subscriptions FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all subscriptions"
ON public.subscriptions FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to insert transactions for any user
CREATE POLICY "Admins can insert transactions for any user"
ON public.alc_transactions FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all transactions"
ON public.alc_transactions FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));