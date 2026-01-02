-- Clean data for testing "End of Day" flow
-- Deletes: Audit Items, Audits, Cierres (Closures)
-- Preserves: Assignments and Serials (mostly) so they can be "used" again?
-- Actually, if we delete Cierres, we should probably reset Serial status to AVAILABLE if it was SOLD.

BEGIN;

-- 1. Delete Audit Data (Foreign Keys first)
DELETE FROM public.inventory_audit_items;
DELETE FROM public.inventory_audits;

-- 2. Delete Closures
-- 2. Delete Closures (Instalaciones Reportadas) and Related
DELETE FROM public.revisiones;
DELETE FROM public.cierres;
DELETE FROM public.asignaciones;
DELETE FROM public.clientes; -- Asumiendo que las instalaciones crean clientes nuevos

-- 3. Reset Serial Status (Optional, but good for retrying "Finalize Spool")
-- If the spool was marked SOLD by the action, we want to bring it back to AVAILABLE/ASSIGNED
-- so we can test the "Finalize" action again.
-- However, we don't know *which* ones were just sold. 
-- Let's just reset ALL 'SOLD' serials to 'AVAILABLE' for this test? 
-- Or maybe just keep them as is if the user wants to test "Finalize Action" which marks them sold.
-- If they want to test "Finish Installations" -> "Finish Day", they might need to re-run "Finalize Spool".
UPDATE public.inventory_serials SET status = 'AVAILABLE' WHERE status = 'SOLD';

-- 4. Delete Transactions created by Audits?
-- Audits create transactions with reason "Ajuste Auditoría..."
DELETE FROM public.inventory_transactions WHERE reason LIKE 'Ajuste Auditoría%';

COMMIT;
