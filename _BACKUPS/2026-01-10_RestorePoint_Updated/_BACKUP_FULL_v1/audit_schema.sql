-- 1. Add Tracking Columns to Reports (Cierres)
ALTER TABLE public.cierres 
ADD COLUMN IF NOT EXISTS codigo_carrete text,
ADD COLUMN IF NOT EXISTS tecnico_id uuid REFERENCES auth.users(id);

-- 2. Create Audit History Table
-- Stores the snapshot of the audit for history/evidence purposes.
CREATE TABLE IF NOT EXISTS public.inventory_audits (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    team_id uuid REFERENCES public.teams(id),
    supervisor_id uuid REFERENCES auth.users(id),
    created_at timestamp with time zone DEFAULT now(),
    
    -- Snapshot of the audit
    -- Structure: { "CABLE": { "system_stock": 100, "physical_stock": 90, "diff": -10, "unit": "mts" } }
    audit_data jsonb NOT NULL,
    
    notes text,
    
    CONSTRAINT inventory_audits_pkey PRIMARY KEY (id)
);

-- 3. RLS Policies
ALTER TABLE public.inventory_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view audits" 
ON public.inventory_audits FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Supervisors/Admins can create audits" 
ON public.inventory_audits FOR INSERT 
TO authenticated 
WITH CHECK (true); -- Refine based on roles if needed later
