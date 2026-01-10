-- 1. Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Audit Header Table
CREATE TABLE IF NOT EXISTS public.inventory_audits (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    technician_id uuid NOT NULL,
    supervisor_id uuid DEFAULT auth.uid(),
    created_at timestamp with time zone DEFAULT now(),
    notes text,
    CONSTRAINT inventory_audits_pkey PRIMARY KEY (id),
    CONSTRAINT inventory_audits_technician_id_fkey FOREIGN KEY (technician_id) REFERENCES auth.users(id)
);

-- 3. Audit Items Table (The connection between calculation and reality)
CREATE TABLE IF NOT EXISTS public.inventory_audit_items (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    audit_id uuid NOT NULL,
    product_sku text NOT NULL, -- Storing SKU for historical reference
    product_name text,
    
    -- logic quantities
    theoretical_quantity numeric NOT NULL, -- What system calculated
    physical_quantity numeric NOT NULL,    -- What supervisor counted
    difference numeric GENERATED ALWAYS AS (physical_quantity - theoretical_quantity) STORED,
    
    -- snapshot data
    unit_type text, -- 'UNITS' or 'METERS'
    notes text,
    
    CONSTRAINT inventory_audit_items_pkey PRIMARY KEY (id),
    CONSTRAINT inventory_audit_items_audit_id_fkey FOREIGN KEY (audit_id) REFERENCES public.inventory_audits(id) ON DELETE CASCADE
);

-- 4. Update Serial Table for "Metered Serials" logic
-- Check if column exists first to avoid errors
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_serials' AND column_name = 'initial_quantity') THEN
        ALTER TABLE public.inventory_serials ADD COLUMN initial_quantity integer DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_serials' AND column_name = 'current_quantity') THEN
        ALTER TABLE public.inventory_serials ADD COLUMN current_quantity integer DEFAULT 0;
    END IF;
END $$;

-- 5. Helper Function to Clean "Meters" text
-- Turns "100m", "100 mts", " 100 " into integer 100
CREATE OR REPLACE FUNCTION public.clean_meters(input_text text)
RETURNS integer AS $$
DECLARE
    cleaned_text text;
BEGIN
    -- Remove non-numeric characters
    cleaned_text := regexp_replace(input_text, '[^0-9]', '', 'g');
    
    -- Return null if empty, otherwise cast
    IF cleaned_text = '' THEN
        RETURN 0;
    ELSE
        RETURN CAST(cleaned_text AS integer);
    END IF;
EXCEPTION WHEN OTHERS THEN
    RETURN 0; -- Fallback for safety
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 6. Add RLS Policies (Security)
ALTER TABLE public.inventory_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_audit_items ENABLE ROW LEVEL SECURITY;

-- Allow Supervisors (and Admins) to read/write. 
-- Assuming 'roles' check is done in middleware, but here we can add basic checks if needed.
-- For now allowing authenticated users to read/write for development speed (User can refine policies).
CREATE POLICY "Enable all access for authenticated users" ON public.inventory_audits FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON public.inventory_audit_items FOR ALL USING (auth.role() = 'authenticated');
