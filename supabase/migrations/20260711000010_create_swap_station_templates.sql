-- Migration: 换电站模板 & 加盟申请表
-- 创建 swap_station_templates 和 franchise_applications 表
-- 为 operation_sites 新增 template_id 字段，cabinet_count 改为可选

-- 1. 换电站模板表
CREATE TABLE IF NOT EXISTS swap_station_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  cabinet_count INTEGER NOT NULL DEFAULT 6,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  monthly_rent NUMERIC(10, 2) NOT NULL DEFAULT 0,
  annual_roi NUMERIC(5, 2) NOT NULL DEFAULT 0,
  image_url TEXT,
  gps_lat NUMERIC(10, 6),
  gps_lng NUMERIC(10, 6),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 加盟申请表
CREATE TABLE IF NOT EXISTS franchise_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES swap_station_templates(id) ON DELETE SET NULL,
  location TEXT NOT NULL,
  cabinet_count INTEGER NOT NULL,
  matched_battery_4820 INTEGER NOT NULL DEFAULT 0,
  matched_battery_6035 INTEGER NOT NULL DEFAULT 0,
  matched_battery_7250 INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_remark TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. operation_sites 新增 template_id
ALTER TABLE operation_sites
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES swap_station_templates(id) ON DELETE SET NULL;

-- 4. cabinet_count 改为可选（已有值保持不变，未来允许 NULL 从模板继承）
ALTER TABLE operation_sites
  ALTER COLUMN cabinet_count DROP NOT NULL;

-- 4. 插入默认换电站模板数据
INSERT INTO swap_station_templates (name, cabinet_count, price, monthly_rent, annual_roi) VALUES
('标准站-4仓', 4, 50000, 3500, 12.0),
('标准站-6仓', 6, 72000, 5000, 13.0),
('标准站-8仓', 8, 92000, 6400, 14.0),
('标准站-12仓', 12, 130000, 9000, 15.0),
('标准站-16仓', 16, 168000, 11600, 15.5),
('旗舰站-24仓', 24, 240000, 16500, 16.0);
