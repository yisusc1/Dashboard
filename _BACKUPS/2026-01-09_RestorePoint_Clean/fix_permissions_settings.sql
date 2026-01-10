GRANT ALL ON table system_settings TO postgres, anon, authenticated, service_role;
NOTIFY pgrst, 'reload';
