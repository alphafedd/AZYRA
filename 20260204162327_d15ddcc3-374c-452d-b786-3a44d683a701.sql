-- Enable realtime for wallets table
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;

-- Enable realtime for subscriptions table  
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;

-- Enable realtime for alc_transactions table
ALTER PUBLICATION supabase_realtime ADD TABLE public.alc_transactions;