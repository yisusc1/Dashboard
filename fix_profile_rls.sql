-- Habilitar RLS en la tabla (por seguridad, aunque ya debería estarlo)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 1. Política para permitir INSERT (Crear tu propio perfil)
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- 2. Política para permitir UPDATE (Actualizar tu propio perfil)
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- 3. Política para permitir SELECT (Ver tu propio perfil)
-- Nota: A veces se necesita ver otros perfiles (ej: admin), pero esto asegura lo básico.
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

-- Recargar caché de permisos
NOTIFY pgrst, 'reload schema';
