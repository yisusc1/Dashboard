DO $$
BEGIN
    -- 1. Ensure team_id column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_audits' AND column_name = 'team_id') THEN
        ALTER TABLE public.inventory_audits ADD COLUMN team_id uuid REFERENCES public.teams(id);
    END IF;

    -- 2. Drop NOT NULL constraint from technician_id
    ALTER TABLE public.inventory_audits ALTER COLUMN technician_id DROP NOT NULL;

END $$;
