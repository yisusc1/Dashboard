-- ⚠️ WARNING: THIS SCRIPT DELETES ALL MAINTENANCE HISTORY ⚠️
-- Use this to reset vehicle maintenance data to a clean state.

BEGIN;

-- 1. Clear Maintenance Logs
DELETE FROM public.maintenance_logs;

-- 2. Reset Vehicle Maintenance Counters
UPDATE public.vehiculos
SET 
    last_oil_change_km = NULL,
    last_timing_belt_km = NULL,
    -- Add other fields if they exist and need resetting
    -- last_tire_change_km = NULL, 
    last_maintenance_date = NULL;

COMMIT;

-- Verification
SELECT 
    (SELECT COUNT(*) FROM public.maintenance_logs) as logs_count,
    (SELECT COUNT(*) FROM public.vehiculos WHERE last_oil_change_km IS NOT NULL) as vehicles_with_maintenance;
