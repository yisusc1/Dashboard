CREATE OR REPLACE FUNCTION create_dispatch_transaction_v2(
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
    v_serials TEXT[];
    v_current_user_id UUID;
    v_serial TEXT;
BEGIN
    -- Get current user ID
    v_current_user_id := auth.uid();

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
        
        -- Handle Serials
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

        -- B. Decrement Stock
        UPDATE inventory_products
        SET current_stock = current_stock - v_quantity
        WHERE id = v_product_id;

        -- C. UPDATE SERIALS STATUS (Fix: Mark as ASSIGNED)
        IF array_length(v_serials, 1) > 0 THEN
            FOREACH v_serial IN ARRAY v_serials
            LOOP
                UPDATE inventory_serials
                SET status = 'ASSIGNED',
                    updated_at = NOW()
                WHERE serial_number = v_serial
                  AND product_id = v_product_id;
            END LOOP;
        END IF;

        -- D. Create Transaction Record
        INSERT INTO inventory_transactions (
            product_id,
            type,
            quantity,
            previous_stock,
            new_stock,
            reason,
            assigned_to,
            user_id,
            serials,
            received_by,
            receiver_id
        ) 
        SELECT 
            v_product_id,
            'OUT',
            v_quantity,
            p.current_stock + v_quantity,
            p.current_stock,
            'Despacho a Técnico',
            p_assigned_to,
            v_current_user_id,
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
