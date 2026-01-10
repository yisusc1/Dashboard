-- Add assigned_driver_id to vehiculos
ALTER TABLE public.vehiculos 
ADD COLUMN IF NOT EXISTS assigned_driver_id UUID REFERENCES public.profiles(id);

-- Optional: Add index for performance
CREATE INDEX IF NOT EXISTS idx_vehiculos_assigned_driver ON public.vehiculos(assigned_driver_id);
