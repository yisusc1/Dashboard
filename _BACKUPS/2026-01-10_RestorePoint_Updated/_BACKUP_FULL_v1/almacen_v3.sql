-- 1. Add requires_serial to inventory_products
ALTER TABLE inventory_products 
ADD COLUMN IF NOT EXISTS requires_serial BOOLEAN DEFAULT FALSE;

-- 2. Combo Templates (Plantillas)
CREATE TABLE IF NOT EXISTS inventory_combo_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_combo_template_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES inventory_combo_templates(id) ON DELETE CASCADE,
    product_id UUID REFERENCES inventory_products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1
);

-- 3. Daily Assignments (Dispatch / Active Combos)
CREATE TYPE assignment_status AS ENUM ('ACTIVE', 'RETURNED', 'PARTIAL_RETURN');

CREATE TABLE IF NOT EXISTS inventory_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL, -- CMB-001
    assigned_to UUID REFERENCES auth.users(id), -- Or profiles, using auth.users for FK consistency
    status assignment_status DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS inventory_assignment_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID REFERENCES inventory_assignments(id) ON DELETE CASCADE,
    product_id UUID REFERENCES inventory_products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    serials JSONB DEFAULT '[]'::jsonb -- Stores array of serial numbers
);

-- 4. Enable RLS
ALTER TABLE inventory_combo_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_combo_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_assignment_items ENABLE ROW LEVEL SECURITY;

-- Policies (Open for now, refine later)
CREATE POLICY "Allow all to auth" ON inventory_combo_templates FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all to auth" ON inventory_combo_template_items FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all to auth" ON inventory_assignments FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all to auth" ON inventory_assignment_items FOR ALL TO authenticated USING (true);

-- Sequence? Or just use a function/trigger to generate CMB-XXX.
-- Simple approach: Calculate max ID on insert logic in backend or simple query.
-- Using a sequence object for safe concurrency
CREATE SEQUENCE IF NOT EXISTS combo_code_seq START 1;
