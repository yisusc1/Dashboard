-- Helper function to update maintenance info based on model pattern
DO $$
DECLARE
    v_id UUID;
BEGIN
    -- Panel 1
    UPDATE public.vehiculos SET last_timing_belt_km = 297000, last_oil_change_km = 261784 WHERE modelo LIKE '%PANEL 1)%';
    
    -- Panel 2
    UPDATE public.vehiculos SET last_timing_belt_km = 276687, last_oil_change_km = 258217 WHERE modelo LIKE '%PANEL 2)%';

    -- Panel 3
    UPDATE public.vehiculos SET last_timing_belt_km = 281583, last_oil_change_km = 280000 WHERE modelo LIKE '%PANEL 3)%';

    -- Panel 4
    UPDATE public.vehiculos SET last_timing_belt_km = 450000, last_oil_change_km = 405000 WHERE modelo LIKE '%PANEL 4)%';

    -- Panel 6
    UPDATE public.vehiculos SET last_timing_belt_km = 171411, last_oil_change_km = 192100 WHERE modelo LIKE '%PANEL 6)%';

    -- Panel 7
    UPDATE public.vehiculos SET last_timing_belt_km = 275200, last_oil_change_km = 247900 WHERE modelo LIKE '%PANEL 7)%';

    -- Panel 8
    UPDATE public.vehiculos SET last_timing_belt_km = 343711, last_oil_change_km = 298711 WHERE modelo LIKE '%PANEL 8)%';

    -- Panel 9
    UPDATE public.vehiculos SET last_timing_belt_km = 305200, last_oil_change_km = 259200 WHERE modelo LIKE '%PANEL 9)%';

    -- Peugeot
    UPDATE public.vehiculos SET last_timing_belt_km = 180000, last_oil_change_km = 146000 WHERE modelo ILIKE '%PEUGEOT%';

    -- Donfeng blanca (Rich ZN 1, check color or code)
    -- Assuming 'DONFENG RICH ZN (1)' is the white one. User said "Donfeng blanca". 
    -- vehicle_rows says 'DONFENG RICH ZN (1)' has color 'Blanco'.
    UPDATE public.vehiculos SET last_oil_change_km = 246300 WHERE modelo ILIKE '%DONFENG%1%';

    -- Donfeng azul
    -- vehicle_rows says 'DONFENG RICH ZN (2)' has color 'Azul'.
    UPDATE public.vehiculos SET last_oil_change_km = 317000 WHERE modelo ILIKE '%DONFENG%2%';

    -- Hylux
    UPDATE public.vehiculos SET last_oil_change_km = 275400 WHERE modelo ILIKE '%HILUX%';

    -- Npr (Chevrolet NKR)
    -- User said "Se le hizo servicio el día 27/05/2025" but didn't give KM. 
    -- I will leave it null or try to find KM later. For now null.

    -- Triton
    UPDATE public.vehiculos SET last_oil_change_km = 214908 WHERE modelo ILIKE '%TRITON%';

    -- Cerato
    -- User gave belt 258.848km, oil empty.
    UPDATE public.vehiculos SET last_timing_belt_km = 258848 WHERE modelo ILIKE '%CERATO%';

END $$;
