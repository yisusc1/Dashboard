CREATE TABLE IF NOT EXISTS fuel_daily_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_date DATE NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  supervisor_id UUID REFERENCES auth.users(id),
  total_liters NUMERIC NOT NULL,
  details JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE fuel_daily_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read for authenticated users" ON fuel_daily_reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for authenticated users" ON fuel_daily_reports FOR INSERT TO authenticated WITH CHECK (true);
