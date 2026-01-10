BEGIN;

-- 1. Operations (Clients & Closures)
DELETE FROM public.revisiones;
DELETE FROM public.cierres;
DELETE FROM public.asignaciones;
DELETE FROM public.clientes;

-- 2. Audit & Inventory Operations
DELETE FROM public.inventory_audit_items;
DELETE FROM public.inventory_audits;

-- 3. Spool Assignments & Returns
DELETE FROM public.inventory_assignment_items;
DELETE FROM public.inventory_assignments;
DELETE FROM public.inventory_return_items;
DELETE FROM public.inventory_returns;

-- 4. Transactions (Reset History)
DELETE FROM public.inventory_transactions;

-- 5. Reset Serial Status
-- Bring all serials back to 'AVAILABLE' and reset their quantities?
-- Resetting quantities might be too aggressive if they were adjusted manually. 
-- But for "Clean State", maybe we want to reset them to initial?
-- Let's just reset status. User can edit quantity in DB if needed or just re-assign.
UPDATE public.inventory_serials SET status = 'AVAILABLE', current_quantity = initial_quantity;

COMMIT;
