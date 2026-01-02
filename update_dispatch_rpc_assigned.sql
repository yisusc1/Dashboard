CREATE OR REPLACE FUNCTION create_dispatch_transaction(
    p_assigned_to UUID,
    p_code TEXT,
    p_received_by TEXT,
    p_receiver_id TEXT,
    p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_assignment_id UUID;
    v_item JSONB;
    v_product_id UUID;
    v_quantity INTEGER;
    v_serials TEXT[]; -- Cast from JSON
BEGIN
    -- 1. Create Assignment Record
    INSERT INTO inventory_assignments (
        assigned_to,
        code,
        status,
        received_by,
        receiver_id
    ) VALUES (
        p_assigned_to,
        p_code,
        'ACTIVE',
        p_received_by,
        p_receiver_id
    )
    RETURNING id INTO v_assignment_id;

    -- 2. Process Items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_quantity := (v_item->>'quantity')::INTEGER;
        
        -- Handle Serials: Convert JSON array to Text Array
        SELECT ARRAY(SELECT jsonb_array_elements_text(v_item->'serials')) INTO v_serials;

        -- A. Create Assignment Item
        INSERT INTO inventory_assignment_items (
            assignment_id,
            product_id,
            quantity,
            serials
        ) VALUES (
            v_assignment_id,
            v_product_id,
            v_quantity,
            to_jsonb(v_serials)
        );

        -- B. Decrement Stock from Main Inventory
        UPDATE inventory_products
        SET current_stock = current_stock - v_quantity
        WHERE id = v_product_id;

        -- C. Update Serial Status to 'ASSIGNED'
        IF array_length(v_serials, 1) > 0 THEN
            UPDATE inventory_serials
            SET status = 'ASSIGNED'
            WHERE serial_number = ANY(v_serials)
              AND product_id = v_product_id;
        END IF;

        -- D. Create Transaction Record (Audit Log)
        INSERT INTO inventory_transactions (
            product_id,
            type,
            quantity,
            previous_stock,
            new_stock,
            reason,
            assigned_to,
            serials,
            received_by,
            receiver_id
        ) 
        SELECT 
            v_product_id,
            'OUT', -- Dispatch Type
            v_quantity,
            p.current_stock + v_quantity,
            p.current_stock,
            'Despacho a Técnico',
            p_assigned_to,
            to_jsonb(v_serials),
            p_received_by,
            p_receiver_id
        FROM inventory_products p
        WHERE p.id = v_product_id;

    END LOOP;

    RETURN jsonb_build_object('success', true, 'id', v_assignment_id);

EXCEPTION WHEN OTHERS THEN
    RAISE;
END;
$$;
