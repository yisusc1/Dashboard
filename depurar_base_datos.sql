-- ============================================
-- SCRIPT DE DEPURACIÓN DE BASE DE DATOS
-- Dashboard - Solo módulos activos
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- PASO 1: Tablas independientes (sin FKs entrantes)
DROP TABLE IF EXISTS public.network_nodes CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.config_totales CASCADE;
DROP TABLE IF EXISTS public.historial_reportes CASCADE;
DROP TABLE IF EXISTS public.installations CASCADE;
DROP TABLE IF EXISTS public.technician_daily_reports CASCADE;

-- PASO 2: Tablas de inventario y auditoría (con FKs entrantes o sin ellas)
DROP TABLE IF EXISTS public.inventory_bundle_items CASCADE;
DROP TABLE IF EXISTS public.inventory_combo_template_items CASCADE;
DROP TABLE IF EXISTS public.inventory_combo_templates CASCADE;
DROP TABLE IF EXISTS public.inventory_assignment_items CASCADE;
DROP TABLE IF EXISTS public.inventory_assignments CASCADE;
DROP TABLE IF EXISTS public.inventory_audit_items CASCADE;
DROP TABLE IF EXISTS public.inventory_audits CASCADE;
DROP TABLE IF EXISTS public.inventory_return_items CASCADE;
DROP TABLE IF EXISTS public.inventory_returns CASCADE;
DROP TABLE IF EXISTS public.inventory_transactions CASCADE;
DROP TABLE IF EXISTS public.inventory_serials CASCADE;
DROP TABLE IF EXISTS public.inventory_products CASCADE;
DROP VIEW IF EXISTS public.view_spool_status CASCADE;

-- PASO 3: Tablas del flujo Técnicos/Soporte (hijos primero)
DROP TABLE IF EXISTS public.revisiones CASCADE;
DROP TABLE IF EXISTS public.soportes CASCADE;
DROP TABLE IF EXISTS public.asignaciones CASCADE;
DROP TABLE IF EXISTS public.cierres CASCADE;
DROP TABLE IF EXISTS public.clientes CASCADE;

-- PASO 4: Vistas sin uso y Equipos
DROP VIEW IF EXISTS public.vista_fallas_activas CASCADE;
ALTER TABLE IF EXISTS public.profiles DROP COLUMN IF EXISTS team_id CASCADE;
DROP TABLE IF EXISTS public.teams CASCADE;

-- PASO 5: Verificación
-- Ejecutar después del DROP para confirmar que solo quedan las tablas necesarias:
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
