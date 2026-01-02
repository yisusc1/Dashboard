CREATE OR REPLACE FUNCTION reset_operations_v2()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 1. Delete Reporting Data (Cierres)
    DELETE FROM cierres WHERE id IS NOT NULL;
    
    -- 2. Delete Dependent Operational Tables (Revisiones, Asignaciones)
    -- Must be deleted BEFORE clientes
    DELETE FROM revisiones WHERE id IS NOT NULL; -- Handles the FK Error
    DELETE FROM asignaciones WHERE id IS NOT NULL; -- Also depends on clientes

    -- 3. Delete Clients (Installations)
    DELETE FROM clientes WHERE id IS NOT NULL;

    -- 4. Delete Returns
    DELETE FROM inventory_return_items WHERE id IS NOT NULL;
    DELETE FROM inventory_returns WHERE id IS NOT NULL;

    -- 5. Delete Assignments (Inventory)
    DELETE FROM inventory_assignment_items WHERE id IS NOT NULL;
    DELETE FROM inventory_assignments WHERE id IS NOT NULL;
    
    -- 6. Reset Serial Statuses
    UPDATE inventory_serials
    SET status = 'AVAILABLE'
    WHERE status != 'AVAILABLE'; 

    -- 7. Audits
    DELETE FROM inventory_audit_items WHERE id IS NOT NULL;
    DELETE FROM inventory_audits WHERE id IS NOT NULL;

END;
$$;
