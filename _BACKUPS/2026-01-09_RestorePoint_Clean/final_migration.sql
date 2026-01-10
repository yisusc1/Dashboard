-- 1. Create the settings table
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- 2. Enable Security
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- 3. Create Permissive Access Policies (Fixes the "Relation does not exist" and permission errors)
DROP POLICY IF EXISTS "Allow full access to authenticated" ON system_settings;
CREATE POLICY "Allow full access to authenticated" ON system_settings
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Allow generic read access (optional but good for debugging)
DROP POLICY IF EXISTS "Allow read to anon" ON system_settings;
CREATE POLICY "Allow read to anon" ON system_settings
    FOR SELECT TO anon USING (true);

-- 5. Insert Default Configuration
INSERT INTO system_settings (key, value, description)
VALUES ('INSTALLATION_RESTRICTIONS_ENABLED', 'true'::jsonb, 'Enforce minimum inventory kit for new installations')
ON CONFLICT (key) DO NOTHING;

-- 6. Refresh Cache

-- FIX CLIENTS RLS FOR TEAMS
DROP POLICY IF EXISTS "Enable read access for own clients" ON "public"."clientes";
DROP POLICY IF EXISTS "Enable read for team members" ON "public"."clientes";

CREATE POLICY "Enable read for team members" ON "public"."clientes"
FOR SELECT USING (
  auth.uid() = user_id 
  OR 
  user_id IN (
    SELECT id FROM profiles 
    WHERE team_id = (
      SELECT team_id FROM profiles WHERE id = auth.uid()
    )
    AND team_id IS NOT NULL
  )
);

ALTER TABLE "public"."clientes" ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload';

-- DEBUG: Check Profiles Policies
select
  policyname,
  cmd,
  qual
from
  pg_policies
where
  tablename = 'profiles';
