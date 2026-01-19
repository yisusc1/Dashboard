-- ==========================================
-- FIX: Permitir al rol 'mecanico' ver TODOS los vehículos
-- ==========================================

-- 1. Habilitar RLS en la tabla 'vehiculos' (por seguridad, si no lo estaba)
ALTER TABLE public.vehiculos ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar la política anterior si existe para evitar duplicados
DROP POLICY IF EXISTS "Mecanicos y Admins ven todo" ON public.vehiculos;

-- 3. Crear nueva política permisiva
-- Esta política permite SELECT a cualquier vehiculo SI el usuario es admin o mecanico.
-- Se suma a las políticas existentes (como la de ver vehículos de tu propio departamento).
CREATE POLICY "Mecanicos y Admins ven todo"
ON public.vehiculos
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (
      'mecanico' = ANY(profiles.roles) OR
      'admin' = ANY(profiles.roles)
    )
  )
);

-- 4. Notificar éxito (opcional, solo para verificar en SQL Editor)
DO $$
BEGIN
  RAISE NOTICE 'Política de seguridad actualizada para Mecánicos.';
END $$;
