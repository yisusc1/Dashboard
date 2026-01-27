-- Correction for erroneous mileage in fuel_logs
-- Vehicle ID: 9d89dddb-5c1d-4acb-81bb-7a6e97955952
-- Wrong Mileage: 3777905
-- Correct Mileage: 377905

UPDATE public.fuel_logs
SET mileage = 377905
WHERE vehicle_id = '9d89dddb-5c1d-4acb-81bb-7a6e97955952'
  AND mileage = 3777905;

-- Verification
SELECT * FROM public.fuel_logs 
WHERE vehicle_id = '9d89dddb-5c1d-4acb-81bb-7a6e97955952' 
ORDER BY created_at DESC LIMIT 5;
