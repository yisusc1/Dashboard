
-- Check Assignments and Returns for the User
SELECT id, status, assigned_to, created_at, code
FROM inventory_assignments
WHERE assigned_to = '52806de6-bc7a-4e53-83fd-7002e58d26f4'
ORDER BY created_at DESC
LIMIT 5;

-- Check Returns created today
SELECT *
FROM inventory_returns
WHERE user_id = '52806de6-bc7a-4e53-83fd-7002e58d26f4'
AND created_at > CURRENT_DATE;
