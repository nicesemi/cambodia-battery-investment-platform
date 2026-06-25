-- ============================================================
-- Migration v2: Role-based Platform Refactoring
-- ============================================================

-- 1. Franchisee Stores
CREATE TABLE IF NOT EXISTS franchisee_stores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  city TEXT DEFAULT 'Cambodia',
  address TEXT,
  phone TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','active','suspended','closed')),
  total_batteries INTEGER DEFAULT 0,
  revenue_share REAL DEFAULT 0.3,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Franchisee Applications
CREATE TABLE IF NOT EXISTS franchisee_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  store_name TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT,
  phone TEXT NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by UUID REFERENCES users(id),
  review_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Staff Members (operators)
CREATE TABLE IF NOT EXISTS staff_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  position TEXT DEFAULT 'operator',
  department TEXT DEFAULT 'operations',
  phone TEXT,
  joined_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Investor Orders (purchase history)
CREATE TABLE IF NOT EXISTS investor_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES battery_assets(id) ON DELETE SET NULL,
  units INTEGER NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending','completed','cancelled')),
  store_id UUID REFERENCES franchisee_stores(id) ON DELETE SET NULL,
  order_source TEXT DEFAULT 'online',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Store QR Codes
ALTER TABLE franchisee_stores ADD COLUMN IF NOT EXISTS qr_code_url TEXT;

-- Enable RLS
ALTER TABLE franchisee_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE franchisee_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_orders ENABLE ROW LEVEL SECURITY;

-- Policies for admin/operator full access
DO $$ BEGIN
  CREATE POLICY "Admin full access" ON franchisee_stores FOR ALL USING (auth.role() = 'authenticated');
  CREATE POLICY "Admin full access" ON franchisee_applications FOR ALL USING (auth.role() = 'authenticated');
  CREATE POLICY "Admin full access" ON staff_members FOR ALL USING (auth.role() = 'authenticated');
  CREATE POLICY "Admin full access" ON investor_orders FOR ALL USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
