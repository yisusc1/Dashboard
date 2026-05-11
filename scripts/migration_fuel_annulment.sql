ALTER TABLE public.fuel_logs ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
ALTER TABLE public.fuel_logs ADD COLUMN IF NOT EXISTS void_reason text;
ALTER TABLE public.fuel_logs ADD COLUMN IF NOT EXISTS voided_at timestamptz;
ALTER TABLE public.fuel_logs ADD COLUMN IF NOT EXISTS voided_by uuid REFERENCES auth.users(id);
