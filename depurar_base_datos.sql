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

-- PASO 2: Tablas de inventario sin UI (combos/bundles)
DROP TABLE IF EXISTS public.inventory_bundle_items CASCADE;
DROP TABLE IF EXISTS public.inventory_combo_template_items CASCADE;
DROP TABLE IF EXISTS public.inventory_combo_templates CASCADE;

-- PASO 3: Tablas del flujo Técnicos/Soporte (hijos primero)
DROP TABLE IF EXISTS public.revisiones CASCADE;
DROP TABLE IF EXISTS public.soportes CASCADE;
DROP TABLE IF EXISTS public.asignaciones CASCADE;
DROP TABLE IF EXISTS public.cierres CASCADE;
DROP TABLE IF EXISTS public.clientes CASCADE;

-- PASO 4: Verificación
-- Ejecutar después del DROP para confirmar que solo quedan las tablas necesarias:
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
