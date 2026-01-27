-- FUNCTION: assign_vehicle_to_me
-- DESCRIPTION: Allows a driver to securely assign themselves a new vehicle.
--              It automatically unassigns any previous vehicle.
--              Runs as SECURITY DEFINER to bypass standard RLS restrictions on updates.

CREATE OR REPLACE FUNCTION public.assign_vehicle_to_me(target_vehicle_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Escalaties privileges to Owner (Admin)
SET search_path = public -- Secure search path
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Get current executing user's ID from Supabase Auth
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- 1. Unassign any vehicle currently assigned to this user
  UPDATE public.vehiculos
  SET assigned_driver_id = NULL
  WHERE assigned_driver_id = current_user_id;

  -- 2. Assign the new vehicle to this user
  UPDATE public.vehiculos
  SET assigned_driver_id = current_user_id
  WHERE id = target_vehicle_id;

  RETURN TRUE;
END;
$$;
