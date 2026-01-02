-- Migration V2: Combos and Receiver
-- 1. Add assigned_to to transactions for "Receiver" tracking
ALTER TABLE inventory_transactions 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id);

-- 2. Add bundle support to products
ALTER TABLE inventory_products 
ADD COLUMN IF NOT EXISTS is_bundle BOOLEAN DEFAULT FALSE;

-- 3. Table for Bundle Recipes (Items that make up a bundle)
CREATE TABLE IF NOT EXISTS inventory_bundle_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_product_id UUID NOT NULL REFERENCES inventory_products(id) ON DELETE CASCADE,
    child_product_id UUID NOT NULL REFERENCES inventory_products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(parent_product_id, child_product_id)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_inventory_bundle_parent ON inventory_bundle_items(parent_product_id);

-- Enable RLS
ALTER TABLE inventory_bundle_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to authenticated users" ON inventory_bundle_items
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow write access to authenticated users" ON inventory_bundle_items
    FOR ALL TO authenticated USING (true);
