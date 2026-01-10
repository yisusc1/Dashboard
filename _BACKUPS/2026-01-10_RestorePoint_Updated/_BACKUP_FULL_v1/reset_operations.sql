CREATE OR REPLACE FUNCTION reset_operations_v2()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 1. Delete Reporting Data
    DELETE FROM cierres;
    DELETE FROM asignaciones;
    
    -- 2. Delete Clients (Installations)
    DELETE FROM clientes;

    -- 3. Delete Returns (to free up stock history)
    DELETE FROM inventory_return_items;
    DELETE FROM inventory_returns;

    -- 4. Reset Serial Statuses
    UPDATE inventory_serials
    SET status = 'AVAILABLE'
    WHERE status != 'AVAILABLE'; -- Reset all non-available to available

    -- 5. Delete Audits? If part of operations reset
    -- User didn't explicitly ask but "revisiones" might mean "Reviews/Audits".
    -- Let's keep audits for now or delete them if they are "daily operations".
    -- Usually Audits are permanent records. But if this is a "Demo/Test" reset...
    -- Safe to leave Audits for now unless requested. user said "revisiones" (Reviews).
    -- In the app, "Revisiones" refers to Phase 2 of the tech flow?
    -- That is likely 'asignaciones' table (status = 'REVIEW'). So step 1 handles it.

END;
$$;
