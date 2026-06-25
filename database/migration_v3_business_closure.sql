-- ============================================================
-- Migration v3: Business Closure — 加盟商完整业务闭环
-- ============================================================

-- 1. 门店唯一ID：franchisee_stores 增加 store_code
ALTER TABLE franchisee_stores ADD COLUMN IF NOT EXISTS store_code TEXT UNIQUE;

-- 为已有门店补生成 store_code (格式: STORE-XXXXX)
UPDATE franchisee_stores
SET store_code = 'STORE-' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::TEXT, 5, '0')
WHERE store_code IS NULL;

-- 2. 投资者-门店绑定表（店员帮注册时建立绑定）
CREATE TABLE IF NOT EXISTS investor_store_bindings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  investor_id UUID REFERENCES users(id) ON DELETE CASCADE,
  store_id UUID REFERENCES franchisee_stores(id) ON DELETE CASCADE,
  bound_by UUID REFERENCES users(id),               -- 操作店员
  bound_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(investor_id, store_id)
);

-- 3. 门店业绩统计表
CREATE TABLE IF NOT EXISTS store_performance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID REFERENCES franchisee_stores(id) ON DELETE CASCADE UNIQUE,
  total_sales DECIMAL(15,2) DEFAULT 0,              -- 累计销售额
  total_commission DECIMAL(15,2) DEFAULT 0,          -- 累计佣金
  total_rental_income DECIMAL(15,2) DEFAULT 0,       -- 累计租金收益
  order_count INTEGER DEFAULT 0,                     -- 订单数量
  investor_count INTEGER DEFAULT 0,                  -- 绑定投资者数
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 为已有门店初始化业绩记录
INSERT INTO store_performance (store_id)
SELECT id FROM franchisee_stores
ON CONFLICT (store_id) DO NOTHING;

-- 4. 代理商申请表
CREATE TABLE IF NOT EXISTS agent_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL CHECK (agent_type IN ('province_agent', 'city_franchisee')),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  region TEXT NOT NULL,                              -- 申请区域
  city TEXT,                                         -- 申请城市（市级）
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by UUID REFERENCES users(id),
  review_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. franchisee_applications 增加上级代理字段
ALTER TABLE franchisee_applications ADD COLUMN IF NOT EXISTS parent_agent_id UUID REFERENCES users(id);
ALTER TABLE franchisee_applications ADD COLUMN IF NOT EXISTS agent_type TEXT; -- province_agent / city_franchisee / independent

-- 6. 门店触发 store_code 自动生成函数
CREATE OR REPLACE FUNCTION generate_store_code()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  IF NEW.store_code IS NULL THEN
    SELECT COALESCE(MAX(NULLIF(REGEXP_REPLACE(store_code, '^STORE-', ''), '')::INTEGER), 0) + 1
    INTO next_num FROM franchisee_stores;
    NEW.store_code := 'STORE-' || LPAD(next_num::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器（避免重复创建）
DROP TRIGGER IF EXISTS trg_generate_store_code ON franchisee_stores;
CREATE TRIGGER trg_generate_store_code
  BEFORE INSERT ON franchisee_stores
  FOR EACH ROW EXECUTE FUNCTION generate_store_code();

-- 7. 门店业绩触发器：有新订单时自动更新业绩
CREATE OR REPLACE FUNCTION update_store_performance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.store_id IS NOT NULL AND NEW.status = 'completed' THEN
    INSERT INTO store_performance (store_id, total_sales, total_commission, order_count)
    VALUES (NEW.store_id, NEW.total_amount, NEW.total_amount * 0.03, 1)
    ON CONFLICT (store_id) DO UPDATE SET
      total_sales = store_performance.total_sales + NEW.total_amount,
      total_commission = store_performance.total_commission + NEW.total_amount * 0.03,
      order_count = store_performance.order_count + 1,
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_store_performance ON investor_orders;
CREATE TRIGGER trg_update_store_performance
  AFTER INSERT ON investor_orders
  FOR EACH ROW EXECUTE FUNCTION update_store_performance();

-- 8. RLS
ALTER TABLE investor_store_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_applications ENABLE ROW LEVEL SECURITY;

-- 宽松策略（自建JWT方案）
DO $$ BEGIN
  CREATE POLICY "Allow all" ON investor_store_bindings FOR ALL USING (true);
  CREATE POLICY "Allow all" ON store_performance FOR ALL USING (true);
  CREATE POLICY "Allow all" ON agent_applications FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
