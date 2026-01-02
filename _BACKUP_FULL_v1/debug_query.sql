SELECT 
    s.serial_number, 
    s.status as serial_status, 
    ia.code, 
    ia.received_by, 
    ir.created_at as return_date,
    item.condition as return_condition 
FROM inventory_serials s 
LEFT JOIN inventory_assignment_items iai ON s.product_id = iai.product_id AND iai.serials @> jsonb_build_array(s.serial_number) 
LEFT JOIN inventory_assignments ia ON iai.assignment_id = ia.id 
LEFT JOIN inventory_return_items item ON item.product_id = s.product_id AND item.serials @> jsonb_build_array(s.serial_number) 
LEFT JOIN inventory_returns ir ON item.return_id = ir.id 
WHERE s.serial_number = '2B5C8D';
