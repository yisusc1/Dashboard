-- Create Fuel Logs Table
CREATE TABLE IF NOT EXISTS public.fuel_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ticket_number TEXT NOT NULL,
    fuel_date TIMESTAMP WITH TIME ZONE NOT NULL,
    vehicle_id UUID NOT NULL REFERENCES public.vehiculos(id),
    driver_name TEXT NOT NULL,
    liters NUMERIC(10, 2) NOT NULL,
    mileage NUMERIC(10, 2) NOT NULL,
    supervisor_id UUID NOT NULL REFERENCES auth.users(id),
    ticket_url TEXT,
    notes TEXT
);

-- Enable RLS
ALTER TABLE public.fuel_logs ENABLE ROW LEVEL SECURITY;

-- Policies for fuel_logs
CREATE POLICY "Enable read access for authenticated users" ON public.fuel_logs
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.fuel_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Enable update for own logs or admins" ON public.fuel_logs
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = supervisor_id); -- Or add admin role check if needed

-- Create Storage Bucket for Receipts if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('fuel-receipts', 'fuel-receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "Give users access to own folder 1ok223" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'fuel-receipts' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Give users select access 1ok223" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'fuel-receipts' AND
    auth.role() = 'authenticated'
  );
