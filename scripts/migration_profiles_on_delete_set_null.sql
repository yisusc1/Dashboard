-- Permite eliminar un perfil sin borrar el vehículo, poniendo el conductor en NULL
ALTER TABLE public.vehiculos
DROP CONSTRAINT IF EXISTS vehiculos_assigned_driver_id_fkey,
ADD CONSTRAINT vehiculos_assigned_driver_id_fkey
FOREIGN KEY (assigned_driver_id)
REFERENCES public.profiles(id)
ON DELETE SET NULL;

-- Permite eliminar un perfil sin borrar los registros de combustible, poniendo el supervisor en NULL
ALTER TABLE public.fuel_logs
DROP CONSTRAINT IF EXISTS fuel_logs_supervisor_id_profiles_fkey,
ADD CONSTRAINT fuel_logs_supervisor_id_profiles_fkey
FOREIGN KEY (supervisor_id)
REFERENCES public.profiles(id)
ON DELETE SET NULL;
