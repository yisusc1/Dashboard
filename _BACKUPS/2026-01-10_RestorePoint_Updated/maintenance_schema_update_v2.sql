-- Add columns for Moto Chain Kit and Washing
ALTER TABLE public.vehiculos 
ADD COLUMN IF NOT EXISTS last_chain_kit_km NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS last_wash_date TIMESTAMP WITH TIME ZONE;

-- Update the check constraint or just allow the new types in application logic
-- Ideally we update the check constraint in maintenance_logs but postgres makes it hard to alter constraints.
-- We will just use 'OTHER' or simple text for now, or drop and recreate constraint if strict.
-- For simplicity in this iteration, we generally trust existing 'service_type' text field or add a comment.
-- If strict check exists:
ALTER TABLE public.maintenance_logs DROP CONSTRAINT IF EXISTS maintenance_logs_service_type_check;
ALTER TABLE public.maintenance_logs ADD CONSTRAINT maintenance_logs_service_type_check 
CHECK (service_type IN ('OIL_CHANGE', 'TIMING_BELT', 'TIRE_ROTATION', 'CHAIN_KIT', 'WASH', 'OTHER'));
