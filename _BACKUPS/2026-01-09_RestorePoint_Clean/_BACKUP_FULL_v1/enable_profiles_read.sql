-- Enable RLS on profiles if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all profiles (needed to see teammates)
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON public.profiles;
CREATE POLICY "Allow read access for authenticated users" ON public.profiles
    FOR SELECT
    USING (auth.role() = 'authenticated');
