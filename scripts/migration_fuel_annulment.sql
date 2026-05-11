ALTER TABLE public.fuel_logs ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
ALTER TABLE public.fuel_logs ADD COLUMN IF NOT EXISTS void_reason text;
