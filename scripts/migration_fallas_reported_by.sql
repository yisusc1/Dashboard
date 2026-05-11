-- Add reported_by column to fallas table
-- Tracks who reported the fault (driver name from entry reports)
ALTER TABLE fallas ADD COLUMN IF NOT EXISTS reported_by TEXT;
