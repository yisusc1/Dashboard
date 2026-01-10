-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Products Table
CREATE TABLE IF NOT EXISTS inventory_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    current_stock INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 5,
    location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Inventory Transactions (History)
CREATE TYPE transaction_type AS ENUM ('IN', 'OUT', 'ADJUST');

CREATE TABLE IF NOT EXISTS inventory_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES inventory_products(id) ON DELETE CASCADE,
    type transaction_type NOT NULL,
    quantity INTEGER NOT NULL,
    previous_stock INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    reason TEXT,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_products_sku ON inventory_products(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_product_id ON inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created_at ON inventory_transactions(created_at);

-- RLS Policies (Simple: Authenticated users can read/write for now, or refine to 'almacen' role later)
ALTER TABLE inventory_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to authenticated users" ON inventory_products
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow write access to authenticated users" ON inventory_products
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow read access to authenticated users" ON inventory_transactions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow write access to authenticated users" ON inventory_transactions
    FOR ALL TO authenticated USING (true);
