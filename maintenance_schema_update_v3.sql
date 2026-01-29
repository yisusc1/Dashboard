-- Add Corrective Maintenance Columns
ALTER TABLE public.maintenance_logs 
ADD COLUMN IF NOT EXISTS parts_used TEXT, -- Comma separated or JSON details of parts
ADD COLUMN IF NOT EXISTS labor_cost NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS parts_cost NUMERIC(10, 2) DEFAULT 0;

-- Drop constraint if exists to allow more types or just rely on text
ALTER TABLE public.maintenance_logs DROP CONSTRAINT IF EXISTS maintenance_logs_service_type_check;
ALTER TABLE public.maintenance_logs ADD CONSTRAINT maintenance_logs_service_type_check 
    CHECK (service_type IN ('OIL_CHANGE', 'TIMING_BELT', 'TIRE_ROTATION', 'OTHER', 'CHAIN_KIT', 'WASH', 'CORRECTIVE'));
