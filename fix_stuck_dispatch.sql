UPDATE inventory_assignments
SET status = 'RETURNED'
WHERE assigned_to = '52806de6-bc7a-4e53-83fd-7002e58d26f4'
  AND status IN ('ACTIVE', 'PARTIAL_RETURN');
