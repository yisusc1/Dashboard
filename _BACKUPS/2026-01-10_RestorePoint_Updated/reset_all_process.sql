-- ⚠️ WARNING: THIS SCRIPT DELETES ALL PROCESS DATA INCLUDING CLIENTS. ⚠️
-- Use this to completely reset the installation flow to "Point 0".

BEGIN;

-- 1. DELETE OPERATIONAL DATA (Children first)

-- A. Installation/Service Flow
DELETE FROM public.revisiones;    -- Reviews/Audits of installations
DELETE FROM public.cierres;       -- Closures (Finalized installations)
DELETE FROM public.asignaciones;  -- Client Assignments to Technicians

-- B. Inventory Audit Flow
DELETE FROM public.inventory_audit_items;
DELETE FROM public.inventory_audits;

-- C. Inventory Management Flow
DELETE FROM public.inventory_return_items;
DELETE FROM public.inventory_returns;
DELETE FROM public.inventory_assignment_items;
DELETE FROM public.inventory_assignments;
DELETE FROM public.inventory_transactions; -- History logs

-- 2. DELETE MASTER DATA (Parents)

-- Delete Clients (Only after deleting references in allocations/closures/revisions)
DELETE FROM public.clientes;

-- 3. RESET INVENTORY STATE

-- Reset Serials (Spools) to Initial Quantity and Available Status
UPDATE public.inventory_serials
SET 
    current_quantity = initial_quantity,
    status = 'AVAILABLE',
    location = NULL
WHERE initial_quantity IS NOT NULL;

-- 4. (Optional) Reset Non-Serialized Stock
-- UPDATE public.inventory_products SET current_stock = 100 WHERE requires_serial = false; 

COMMIT;

-- Verification
SELECT 
    (SELECT COUNT(*) FROM public.clientes) as clients_count,
    (SELECT COUNT(*) FROM public.revisiones) as revisions_count,
    (SELECT COUNT(*) FROM public.cierres) as closures_count,
    (SELECT COUNT(*) FROM public.inventory_assignments) as inv_assignments_count,
    (SELECT COUNT(*) FROM public.inventory_serials WHERE status = 'AVAILABLE') as available_spools_count;
