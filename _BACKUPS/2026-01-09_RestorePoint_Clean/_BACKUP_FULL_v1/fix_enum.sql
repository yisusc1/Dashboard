-- Add 'CLOSED' to assignment_status enum if it doesn't exist
DO $$
BEGIN
    ALTER TYPE public.assignment_status ADD VALUE 'CLOSED';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
