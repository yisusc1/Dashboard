-- Add FK to profiles for easier joining
ALTER TABLE public.fuel_logs
DROP CONSTRAINT IF EXISTS fuel_logs_supervisor_id_fkey; -- Drop old one to auth.users if needed, or keep both? 
-- Ideally strict reference to profiles ensures the profile exists.
-- But auth.users is the source of truth.
-- Let's add a second FK or replace?
-- Replacing is better for PostgREST embedding to profiles. 
-- But we need to be sure profile exists. 
-- Assuming every supervisor has a profile.

ALTER TABLE public.fuel_logs
ADD CONSTRAINT fuel_logs_supervisor_id_profiles_fkey
FOREIGN KEY (supervisor_id)
REFERENCES public.profiles (id);
