-- Add Fuel Tracking columns to vehiculos table

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehiculos' AND column_name = 'current_fuel_level') THEN
        ALTER TABLE "public"."vehiculos" ADD COLUMN "current_fuel_level" INTEGER DEFAULT 100;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehiculos' AND column_name = 'last_fuel_update') THEN
        ALTER TABLE "public"."vehiculos" ADD COLUMN "last_fuel_update" TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;
