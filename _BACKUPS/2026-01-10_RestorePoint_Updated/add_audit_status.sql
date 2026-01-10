-- Add status column to inventory_audits if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_audits' AND column_name = 'status') THEN
        ALTER TABLE inventory_audits ADD COLUMN status text DEFAULT 'COMPLETED';
    END IF;
END $$;

-- Update defaults for new rows
ALTER TABLE inventory_audits ALTER COLUMN status SET DEFAULT 'PENDING';

-- Allow Supervisor to update this
-- (Assuming RLS allows update by authenticated users or specifically supervisors)
