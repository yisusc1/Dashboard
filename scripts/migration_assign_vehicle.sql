-- Function: Allow a driver to self-assign a vehicle
-- Security: Uses auth.uid() so a driver can only assign themselves, never impersonate another user
-- Logic: 
--   1. Unassigns the driver from their current vehicle (if any)
--   2. Assigns the driver to the target vehicle
CREATE OR REPLACE FUNCTION public.assign_vehicle_to_me(target_vehicle_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id uuid := auth.uid();
BEGIN
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 1. Unassign driver from any vehicle they are currently assigned to
    UPDATE vehiculos
    SET assigned_driver_id = NULL
    WHERE assigned_driver_id = current_user_id;

    -- 2. Assign driver to the target vehicle
    UPDATE vehiculos
    SET assigned_driver_id = current_user_id
    WHERE id = target_vehicle_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.assign_vehicle_to_me(uuid) TO authenticated;
