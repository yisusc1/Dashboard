CREATE OR REPLACE FUNCTION get_installed_serials(p_user_ids UUID[])
RETURNS TABLE (serial TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT onu::TEXT
  FROM clientes
  WHERE user_id = ANY(p_user_ids)
  AND onu IS NOT NULL
  AND onu != '';
END;
$$;
