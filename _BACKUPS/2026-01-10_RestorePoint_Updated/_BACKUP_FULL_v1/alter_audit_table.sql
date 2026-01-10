-- Make technician_id nullable to allow Team audits
ALTER TABLE public.inventory_audits 
ALTER COLUMN technician_id DROP NOT NULL;

-- Ensure team_id exists for Team audits
ALTER TABLE public.inventory_audits 
ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id);
