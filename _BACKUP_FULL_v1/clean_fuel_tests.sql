-- Eliminar todos los registros de carga de combustible
DELETE FROM "public"."fuel_logs";

-- Opcional: Resetear el nivel de combustible de todos los vehículos a 100% (Full) para iniciar pruebas desde cero
UPDATE "public"."vehiculos" 
SET "current_fuel_level" = 100,
    "last_fuel_update" = NOW();
