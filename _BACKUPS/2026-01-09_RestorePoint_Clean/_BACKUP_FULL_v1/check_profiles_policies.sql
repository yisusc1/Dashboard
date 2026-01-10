select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
from
  pg_policies
where
  tablename = 'profiles';
