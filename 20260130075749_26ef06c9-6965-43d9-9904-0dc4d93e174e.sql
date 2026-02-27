-- Add insert policies for wallets and subscriptions (needed for trigger)
CREATE POLICY "System can insert wallets" ON public.wallets
FOR INSERT WITH CHECK (true);

CREATE POLICY "System can insert subscriptions" ON public.subscriptions
FOR INSERT WITH CHECK (true);

-- Make the main admin
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Find user by email (this may not work if user doesn't exist yet)
    SELECT id INTO admin_user_id FROM auth.users WHERE email = 'pierrejacquesfeddly@gmail.com' LIMIT 1;
    
    IF admin_user_id IS NOT NULL THEN
        -- Add admin role if not exists
        INSERT INTO public.user_roles (user_id, role)
        VALUES (admin_user_id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
END $$;