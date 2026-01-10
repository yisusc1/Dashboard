-- Purgar datos de HOY para el usuario Samuel Marin (ID: 153e395a-2add-4f2e-9234-12aa7025754d)
-- Ejecuta esto en el SQL Editor de Supabase para limpiar las pruebas.

BEGIN;

-- 1. Eliminar Auditorías de hoy
DELETE FROM inventory_audits 
WHERE technician_id = '153e395a-2add-4f2e-9234-12aa7025754d'
  AND created_at > (NOW() - INTERVAL '24 hours');

-- 2. Eliminar Cierres/Instalaciones de hoy
DELETE FROM cierres 
WHERE tecnico_id = '153e395a-2add-4f2e-9234-12aa7025754d'
  AND created_at > (NOW() - INTERVAL '24 hours');

COMMIT;
