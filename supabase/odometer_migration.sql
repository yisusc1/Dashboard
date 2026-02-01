-- Add odometro_averiado column to vehiculos table
ALTER TABLE vehiculos 
ADD COLUMN IF NOT EXISTS odometro_averiado BOOLEAN DEFAULT FALSE;

-- Comment
COMMENT ON COLUMN vehiculos.odometro_averiado IS 'Indica si el contador de kilometraje del tablero está roto.';
