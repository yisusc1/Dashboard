CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read to authenticated" ON system_settings
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow write to admins" ON system_settings
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Insert default value
INSERT INTO system_settings (key, value, description)
VALUES ('INSTALLATION_RESTRICTIONS_ENABLED', 'true'::jsonb, 'Enforce minimum inventory kit for new installations')
ON CONFLICT (key) DO NOTHING;
