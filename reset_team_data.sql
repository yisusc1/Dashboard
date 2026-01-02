
-- RESET HISTORY FOR SPECIFIC TEAM (Based on User ID)
DO $$
DECLARE
    target_user_id UUID := '52806de6-bc7a-4e53-83fd-7002e58d26f4'; -- The user we are debugging
    target_team_id UUID;
    member_ids UUID[];
BEGIN
    -- 1. Get Team ID
    SELECT team_id INTO target_team_id FROM profiles WHERE id = target_user_id;
    
    -- 2. Get All Team Members
    SELECT ARRAY_AGG(id) INTO member_ids FROM profiles WHERE team_id = target_team_id;
    
    -- If no team, just use the user
    IF target_team_id IS NULL THEN
        member_ids := ARRAY[target_user_id];
    END IF;

    RAISE NOTICE 'Cleaning data for Team: % (Members: %)', target_team_id, member_ids;

    -- 3. Reset Serials Status to AVAILABLE (for those currently assigned to this team)
    -- We find serials in active assignments for these members
    UPDATE inventory_serials
    SET status = 'AVAILABLE'
    WHERE serial_number IN (
        SELECT jsonb_array_elements_text(serials) 
        FROM inventory_transactions 
        WHERE assigned_to = ANY(member_ids)
    );

    -- 4. Delete Returns (and Items)
    DELETE FROM inventory_return_items 
    WHERE return_id IN (SELECT id FROM inventory_returns WHERE user_id = ANY(member_ids));
    
    DELETE FROM inventory_returns 
    WHERE user_id = ANY(member_ids);

    -- 5. Delete Closures (Cierres)
    -- Start with "Cierre de Jornada" audits?
    DELETE FROM inventory_audits WHERE technician_id = ANY(member_ids) OR team_id = target_team_id;

    -- Delete actual cierres records
    DELETE FROM cierres WHERE tecnico_id = ANY(member_ids) OR tecnico_1 = ANY(SELECT first_name FROM profiles WHERE id = ANY(member_ids)); -- Backup check on name

    -- 6. Delete Clients (Instalaciones de prueba)
    -- MUST DELETE DEPENDENCIES FIRST
    DELETE FROM revisiones WHERE cliente_id IN (SELECT id FROM clientes WHERE user_id = ANY(member_ids));
    DELETE FROM asignaciones WHERE cliente_id IN (SELECT id FROM clientes WHERE user_id = ANY(member_ids));

    DELETE FROM clientes WHERE user_id = ANY(member_ids);

    -- 7. Delete Assignments (Assignments & Transactions)
    DELETE FROM inventory_assignments WHERE assigned_to = ANY(member_ids);
    DELETE FROM inventory_transactions WHERE assigned_to = ANY(member_ids);

    RAISE NOTICE 'Cleanup Complete.';
END $$;
