-- Agrega la columna updated_at a la tabla profiles si no existe
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Notifica a PostgREST para recargar el esquema caché
NOTIFY pgrst, 'reload schema';
