-- 1. Create Maintenance Logs Table
CREATE TABLE IF NOT EXISTS public.maintenance_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    vehicle_id UUID NOT NULL REFERENCES public.vehiculos(id),
    service_type TEXT NOT NULL CHECK (service_type IN ('OIL_CHANGE', 'TIMING_BELT', 'TIRE_ROTATION', 'OTHER')),
    mileage NUMERIC(10, 2) NOT NULL,
    service_date DATE DEFAULT CURRENT_DATE,
    performed_by TEXT,
    notes TEXT,
    cost NUMERIC(10, 2) DEFAULT 0
);

-- 2. Add Last Maintenance Columns to Vehicles (for fast lookup)
ALTER TABLE public.vehiculos 
ADD COLUMN IF NOT EXISTS last_oil_change_km NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS last_timing_belt_km NUMERIC(10, 2);

-- 3. Enable RLS
ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read/write for auth users" ON public.maintenance_logs
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
