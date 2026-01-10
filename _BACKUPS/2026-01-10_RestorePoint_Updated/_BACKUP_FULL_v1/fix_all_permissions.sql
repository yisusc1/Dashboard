-- COMPREHENSIVE RLS FIX
-- Run this to ensure ALL inventory tables are readable/writable by authenticated users

BEGIN;

-- 1. Inventory Assignments
ALTER TABLE public.inventory_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.inventory_assignments;
CREATE POLICY "Enable all access for authenticated users" ON public.inventory_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. Inventory Assignment Items
ALTER TABLE public.inventory_assignment_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.inventory_assignment_items;
CREATE POLICY "Enable all access for authenticated users" ON public.inventory_assignment_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Inventory Products (Often read-only but needs to be readable)
ALTER TABLE public.inventory_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.inventory_products;
CREATE POLICY "Enable read access for authenticated users" ON public.inventory_products FOR SELECT TO authenticated USING (true);

-- 4. Inventory Serials
ALTER TABLE public.inventory_serials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.inventory_serials;
CREATE POLICY "Enable all access for authenticated users" ON public.inventory_serials FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Teams
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.teams;
CREATE POLICY "Enable read access for authenticated users" ON public.teams FOR SELECT TO authenticated USING (true);

COMMIT;
