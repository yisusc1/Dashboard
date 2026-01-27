-- Migration: Enable Driver Unit Assignment (Change Unit)

-- 1. Add assigned_driver_id column to vehiculos table if it doesn't exist
ALTER TABLE public.vehiculos 
ADD COLUMN IF NOT EXISTS assigned_driver_id UUID REFERENCES public.profiles(id);

-- 2. Create index for performance
CREATE INDEX IF NOT EXISTS idx_vehiculos_assigned_driver ON public.vehiculos(assigned_driver_id);

-- 3. Create the RPC function for secure assignment WITH VALIDATION
CREATE OR REPLACE FUNCTION public.assign_vehicle_to_me(target_vehicle_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  vehicle_is_busy BOOLEAN;
BEGIN
  -- Get current executing user's ID
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Validation: Check if vehicle is currently on a trip (km_entrada IS NULL)
  -- We exclude trips belonging to the current user (re-assigning to self is fine, though redundant)
  SELECT EXISTS (
    SELECT 1 
    FROM public.reportes 
    WHERE vehiculo_id = target_vehicle_id 
      AND km_entrada IS NULL
      AND user_id != current_user_id
  ) INTO vehicle_is_busy;

  IF vehicle_is_busy THEN
    RAISE EXCEPTION 'El vehículo seleccionado está actualmente en ruta con otro conductor.';
  END IF;

  -- A. Unassign any vehicle currently assigned to this user
  UPDATE public.vehiculos
  SET assigned_driver_id = NULL
  WHERE assigned_driver_id = current_user_id;

  -- B. Assign the new vehicle to this user
  UPDATE public.vehiculos
  SET assigned_driver_id = current_user_id
  WHERE id = target_vehicle_id;

  RETURN TRUE;
END;
$$;
