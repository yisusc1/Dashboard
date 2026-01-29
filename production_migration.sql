-- MIGRACION A PRODUCCION: SISTEMA DE FALLAS Y MANTENIMIENTO CORRECTIVO

-- 1. Crear tabla de Fallas (Si no existe)
CREATE TABLE IF NOT EXISTS public.fallas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vehiculo_id UUID REFERENCES public.vehiculos(id) ON DELETE CASCADE,
    descripcion TEXT NOT NULL,
    prioridad TEXT DEFAULT 'Media', -- Baja, Media, Alta
    tipo_falla TEXT DEFAULT 'Mecánica', -- Mecánica, Eléctrica, Cauchos, Carrocería, Otro
    estado TEXT DEFAULT 'Pendiente', -- Pendiente, En Revisión, Reparado, Desestimado
    fecha_reporte TIMESTAMPTZ DEFAULT NOW(),
    fecha_solucion TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS en Fallas
ALTER TABLE public.fallas ENABLE ROW LEVEL SECURITY;

-- Políticas de Seguridad para Fallas (Ajustar según roles de producción)
-- Permitir lectura a todos los autenticados
CREATE POLICY "Enable read access for authenticated users" ON public.fallas
    FOR SELECT TO authenticated USING (true);

-- Permitir inserción a todos los autenticados (Conductores, Gerencia)
CREATE POLICY "Enable insert access for authenticated users" ON public.fallas
    FOR INSERT TO authenticated WITH CHECK (true);

-- Permitir actualización a todos los autenticados (Taller, Gerencia)
CREATE POLICY "Enable update access for authenticated users" ON public.fallas
    FOR UPDATE TO authenticated USING (true);

-- 2. Actualizar Tabla de Mantenimiento (Maintenance Logs)
ALTER TABLE public.maintenance_logs 
ADD COLUMN IF NOT EXISTS parts_used TEXT, -- Repuestos usados
ADD COLUMN IF NOT EXISTS labor_cost NUMERIC(10, 2) DEFAULT 0, -- Costo de mano de obra
ADD COLUMN IF NOT EXISTS parts_cost NUMERIC(10, 2) DEFAULT 0; -- Costo de repuestos

-- Actualizar restricción de tipos de servicio para incluir 'CORRECTIVE'
ALTER TABLE public.maintenance_logs DROP CONSTRAINT IF EXISTS maintenance_logs_service_type_check;
ALTER TABLE public.maintenance_logs ADD CONSTRAINT maintenance_logs_service_type_check 
    CHECK (service_type IN ('OIL_CHANGE', 'TIMING_BELT', 'TIRE_ROTATION', 'OTHER', 'CHAIN_KIT', 'WASH', 'CORRECTIVE'));

-- 3. Índices para Optimización (Opcional pero recomendado)
CREATE INDEX IF NOT EXISTS idx_fallas_vehiculo_estado ON public.fallas(vehiculo_id, estado);
CREATE INDEX IF NOT EXISTS idx_fallas_created_at ON public.fallas(created_at DESC);
