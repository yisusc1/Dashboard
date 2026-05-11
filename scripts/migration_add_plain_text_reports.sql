-- Añadir campo para usar reportes en texto plano (sin emojis)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS plain_text_reports BOOLEAN DEFAULT false;
