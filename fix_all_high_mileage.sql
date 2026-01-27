-- Bulk Correction for recursive erroneous mileage logic
-- Vehicle ID: 9d89dddb-5c1d-4acb-81bb-7a6e97955952
-- Threshold: > 500,000 (Assuming valid is ~377,000)
-- Target Value: 377905 (User provided correct value)

-- 1. Fix Fuel Logs
UPDATE public.fuel_logs
SET mileage = 377905
WHERE vehicle_id = '9d89dddb-5c1d-4acb-81bb-7a6e97955952'
  AND mileage > 500000;

-- 2. Fix Entry Reports
UPDATE public.reportes
SET km_entrada = 377905
WHERE vehiculo_id = '9d89dddb-5c1d-4acb-81bb-7a6e97955952'
  AND km_entrada > 500000;

-- 3. Fix Exit Reports
UPDATE public.reportes
SET km_salida = 377905
WHERE vehiculo_id = '9d89dddb-5c1d-4acb-81bb-7a6e97955952'
  AND km_salida > 500000;

-- Verification
SELECT 
    'Result' as status,
    MAX(ultimo_kilometraje) as nuevo_kilometraje_maximo
FROM public.vista_ultimos_kilometrajes
WHERE vehiculo_id = '9d89dddb-5c1d-4acb-81bb-7a6e97955952';
