-- Force schema cache reload by modifying structure
ALTER TABLE public.inventory_audits ADD COLUMN IF NOT EXISTS _cache_fix integer;
ALTER TABLE public.inventory_audits DROP COLUMN _cache_fix;
NOTIFY pgrst, 'reload';
