-- Eliminar la vista anterior para asegurar que se recree correctamente
DROP VIEW IF EXISTS public.vista_ultimos_kilometrajes;

-- Recrear la vista incluyendo la tabla fuel_logs
CREATE VIEW public.vista_ultimos_kilometrajes AS
SELECT
    vehiculo_id,
    MAX(km) as ultimo_kilometraje
FROM (
    -- 1. Reportes de Entrada
    SELECT vehiculo_id, km_entrada as km
    FROM public.reportes
    WHERE km_entrada IS NOT NULL AND km_entrada > 0

    UNION ALL

    -- 2. Reportes de Salida
    SELECT vehiculo_id, km_salida as km
    FROM public.reportes
    WHERE km_salida IS NOT NULL AND km_salida > 0

    UNION ALL

    -- 3. Cargas de Combustible
    SELECT vehicle_id as vehiculo_id, mileage as km
    FROM public.fuel_logs
    WHERE mileage IS NOT NULL AND mileage > 0
) as combined_km
GROUP BY vehiculo_id;
