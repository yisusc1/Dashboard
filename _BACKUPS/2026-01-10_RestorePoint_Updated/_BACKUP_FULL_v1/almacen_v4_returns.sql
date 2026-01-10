-- 1. Returns Header Table
CREATE TABLE IF NOT EXISTS inventory_returns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID REFERENCES inventory_assignments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    user_id UUID REFERENCES auth.users(id) -- Who processed the return
);

-- 2. Returns Items Table
CREATE TABLE IF NOT EXISTS inventory_return_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    return_id UUID REFERENCES inventory_returns(id) ON DELETE CASCADE,
    product_id UUID REFERENCES inventory_products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    condition TEXT DEFAULT 'GOOD' -- GOOD, DAMAGED, ETC.
);

-- 3. RLS Policies
ALTER TABLE inventory_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_return_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all to auth" ON inventory_returns FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all to auth" ON inventory_return_items FOR ALL TO authenticated USING (true);
