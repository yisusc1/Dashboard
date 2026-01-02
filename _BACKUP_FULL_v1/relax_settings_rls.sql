-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow read to authenticated" ON system_settings;
DROP POLICY IF EXISTS "Allow write to admins" ON system_settings;

-- Create a permissive policy for authenticated users (Access Control handled by App Logic)
CREATE POLICY "Allow full access to authenticated" ON system_settings
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Ensure RLS is enabled (or disabled if we prefer, but keeping it enabled with permissive policy is standard)
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Notify reload just in case
NOTIFY pgrst, 'reload';
