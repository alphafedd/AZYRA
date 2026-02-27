-- Add unique constraint on daily_limits for user_id and date
ALTER TABLE public.daily_limits ADD CONSTRAINT daily_limits_user_date_unique UNIQUE (user_id, date);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_daily_limits_user_date ON public.daily_limits (user_id, date);