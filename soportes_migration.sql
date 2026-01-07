-- Migration: Support Reports and View Update (CORRECTED)
-- 1. Create 'soportes' table
CREATE TABLE IF NOT EXISTS public.soportes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cliente_id uuid,
  tecnico_id uuid,
  fecha text,
  hora text,
  precinto text,
  caja_nap text,
  potencia text,
  coordenadas text,
  cantidad_puertos text,
  puerto text,
  zona text,
  estatus text DEFAULT 'Realizado',
  causa text,
  
  -- Materials
  codigo_carrete text,
  metraje_usado numeric DEFAULT 0,
  metraje_desechado numeric DEFAULT 0,
  conectores integer DEFAULT 0,
  tensores integer DEFAULT 0,
  patchcord integer DEFAULT 0,
  rosetas integer DEFAULT 0,
  
  -- Equipment Swap
  onu_anterior text,
  onu_nueva text,
  
  observacion text,
  realizado_por text,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT soportes_pkey PRIMARY KEY (id)
);

-- 2. Enable RLS
ALTER TABLE public.soportes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read/write for auth users" ON public.soportes
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 3. Update 'view_spool_status' to include Soportes usage using INVENTORY_SERIALS
DROP VIEW IF EXISTS view_spool_status;

CREATE OR REPLACE VIEW view_spool_status AS
WITH latest_audits AS (
    SELECT DISTINCT ON (product_sku)
        product_sku AS serial,
        physical_quantity,
        updated_at as audit_date
    FROM inventory_audit_items
    JOIN inventory_audits ON inventory_audits.id = inventory_audit_items.audit_id
    WHERE inventory_audits.status = 'COMPLETED'
    ORDER BY product_sku, inventory_audits.updated_at DESC
),
combined_usage AS (
    -- Distinguish sources if needed, or just union properties
    -- Cierres
    SELECT 
        codigo_carrete, 
        metraje_usado, 
        metraje_desechado, 
        created_at 
    FROM cierres
    WHERE codigo_carrete IS NOT NULL AND codigo_carrete != ''
    
    UNION ALL
    
    -- Soportes (Ensure columns match types/text)
    SELECT 
        codigo_carrete, 
        metraje_usado::text, 
        metraje_desechado::text, 
        created_at 
    FROM soportes
    WHERE codigo_carrete IS NOT NULL AND codigo_carrete != ''
),
spool_usage AS (
    SELECT
        c.codigo_carrete as serial,
        SUM(
             -- Robust numeric parsing
             COALESCE(CAST(NULLIF(regexp_replace(c.metraje_usado, '[^0-9.]', '', 'g'), '') AS NUMERIC), 0) +
             COALESCE(CAST(NULLIF(regexp_replace(c.metraje_desechado, '[^0-9.]', '', 'g'), '') AS NUMERIC), 0)
        ) as total_usage
    FROM combined_usage c
    LEFT JOIN latest_audits la ON c.codigo_carrete = la.serial
    LEFT JOIN inventory_serials s ON c.codigo_carrete = s.serial_number
    -- Filter usage AFTER the base date (Audit or Creation)
    WHERE c.created_at > COALESCE(la.audit_date, s.created_at, '1970-01-01'::timestamp)
    GROUP BY c.codigo_carrete
)
SELECT
    s.serial_number,
    s.initial_quantity,
    s.status,
    -- Base Logic
    COALESCE(la.physical_quantity, s.initial_quantity) as base_quantity,
    COALESCE(la.audit_date, s.created_at) as base_date,
    -- Usage Logic
    COALESCE(u.total_usage, 0) as usage_since_base,
    -- Current Logic
    (COALESCE(la.physical_quantity, s.initial_quantity) - COALESCE(u.total_usage, 0)) as current_quantity
FROM inventory_serials s
LEFT JOIN latest_audits la ON s.serial_number = la.serial
LEFT JOIN spool_usage u ON s.serial_number = u.serial;

GRANT SELECT ON view_spool_status TO authenticated;
GRANT SELECT ON view_spool_status TO service_role;
