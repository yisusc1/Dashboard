-- Actualizar la vista de kilometrajes para incluir Cargas de Combustible y Salidas
CREATE OR REPLACE VIEW public.vista_ultimos_kilometrajes AS
SELECT
    vehiculo_id,
    MAX(km) as ultimo_kilometraje
FROM (
    -- 1. Reportes de Entrada (Ya existía)
    SELECT vehiculo_id, km_entrada as km
    FROM public.reportes
    WHERE km_entrada IS NOT NULL

    UNION ALL

    -- 2. Reportes de Salida (Nuevo: Para mayor precisión si se reporta salida sin entrada previa)
    SELECT vehiculo_id, km_salida as km
    FROM public.reportes
    WHERE km_salida IS NOT NULL

    UNION ALL

    -- 3. Cargas de Combustible (Nuevo: Lo que pidió el usuario)
    SELECT vehicle_id as vehiculo_id, mileage as km
    FROM public.fuel_logs
    WHERE mileage IS NOT NULL
) as combined_km
GROUP BY vehiculo_id;
