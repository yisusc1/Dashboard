-- ⚠️ PRECAUCIÓN: Este script reiniciará el kilometraje de TODOS los vehículos a 0.
-- Mantendrá el historial de viajes y cargas, pero los valores de kilometraje históricos serán 0.

BEGIN;

-- 1. Reiniciar Kilometraje Base en la tabla de Vehículos
UPDATE vehiculos 
SET kilometraje = 0;

-- 2. Reiniciar Kilometraje en Reportes de Entrada y Salida
UPDATE reportes 
SET km_salida = 0, 
    km_entrada = 0;

-- 3. Reiniciar Kilometraje en Cargas de Combustible
UPDATE fuel_logs 
SET mileage = 0;

COMMIT;

-- Después de ejecutar esto:
-- 1. Ve al Panel de Administración > Vehículos.
-- 2. Usa la opción "Corregir Kilometraje" para establecer el valor REAL inicial de cada vehículo.
-- IMPORTANTE: Haz esto ANTES de que los choferes empiecen a reportar.
