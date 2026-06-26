-- Add talonario_vehiculo_id to fuel_logs
ALTER TABLE public.fuel_logs
ADD COLUMN talonario_vehiculo_id uuid REFERENCES public.vehiculos(id);

-- Make existing logs default their talonario to their vehicle_id
UPDATE public.fuel_logs
SET talonario_vehiculo_id = vehicle_id
WHERE talonario_vehiculo_id IS NULL;

-- Ensure future inserts without explicit talonario fallback to vehicle_id at application level, 
-- but we can't easily set a dynamic default in SQL based on another column, so we handle it in app/actions.ts.
