-- Enable RLS on Assignments but make it permissive for Authenticated users
ALTER TABLE public.inventory_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_assignment_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid errors)
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.inventory_assignments;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.inventory_assignment_items;

-- Create Permissive Policies for Authenticated Users
CREATE POLICY "Enable read access for authenticated users"
ON public.inventory_assignments
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable read access for authenticated users"
ON public.inventory_assignment_items
FOR SELECT
TO authenticated
USING (true);

-- Also ensure INSERT is allowed (though Actions use Service Role usually? No, SSR uses Anon/Auth context)
-- Wait, if using createServerClient with cookies, it uses User Context.
-- So we need INSERT policy too for Supervisor.
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.inventory_assignments;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.inventory_assignment_items;

CREATE POLICY "Enable insert for authenticated users"
ON public.inventory_assignments
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable insert for authenticated users"
ON public.inventory_assignment_items
FOR INSERT
TO authenticated
WITH CHECK (true);

-- And Update
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.inventory_assignments;
CREATE POLICY "Enable update for authenticated users"
ON public.inventory_assignments
FOR UPDATE
TO authenticated
USING (true);
