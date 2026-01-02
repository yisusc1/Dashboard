-- 1. Check if user_id exists and populate it if missing
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cierres' AND column_name = 'tecnico_id') THEN
        UPDATE cierres 
        SET user_id = tecnico_id 
        WHERE user_id IS NULL AND tecnico_id IS NOT NULL;
    END IF;
END $$;

-- 2. Ensure RLS Policy allows users to see their own closures
-- Drop existing policy if it exists to avoid conflict (or create robustly)
DROP POLICY IF EXISTS "Enable read access for own closures" ON cierres;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON cierres;

-- Re-create Read Policy
CREATE POLICY "Enable read access for own closures" ON cierres
    FOR SELECT
    USING (auth.uid() = user_id OR auth.uid() = tecnico_id);

-- Re-create Insert Policy (ensure it allows auth users)
CREATE POLICY "Enable insert for authenticated users" ON cierres
    FOR INSERT
    WITH CHECK (auth.uid() = user_id OR auth.uid() = tecnico_id);

-- 3. Grant permissions just in case
GRANT ALL ON cierres TO authenticated;
