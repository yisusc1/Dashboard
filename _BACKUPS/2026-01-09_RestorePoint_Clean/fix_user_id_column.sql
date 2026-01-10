-- Migration: Add user_id to form tables
-- Date: 2026-01-02
-- Purpose: Fix "Could not find the 'user_id' column" error by adding the missing column to relevant tables.

-- 1. Add user_id to asignaciones
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'asignaciones' AND column_name = 'user_id') THEN
        ALTER TABLE public.asignaciones ADD COLUMN user_id uuid REFERENCES auth.users(id);
    END IF;
END $$;

-- 2. Add user_id to revisiones (Create table if not exists, though it should exist based on code)
CREATE TABLE IF NOT EXISTS public.revisiones (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    cliente_id uuid NOT NULL,
    ubicacion text,
    precinto text,
    mac_onu text,
    caja_nap text,
    cant_puertos text,
    puerto_conectado text,
    coordenadas text,
    potencia_nap text,
    potencia_cliente text,
    observacion text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    user_id uuid REFERENCES auth.users(id), -- Add it directly if creating
    CONSTRAINT revisiones_pkey PRIMARY KEY (id)
);

-- If table existed but column didn't:
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'revisiones' AND column_name = 'user_id') THEN
        ALTER TABLE public.revisiones ADD COLUMN user_id uuid REFERENCES auth.users(id);
    END IF;
END $$;

-- 3. Add user_id to cierres
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cierres' AND column_name = 'user_id') THEN
        ALTER TABLE public.cierres ADD COLUMN user_id uuid REFERENCES auth.users(id);
    END IF;
END $$;
