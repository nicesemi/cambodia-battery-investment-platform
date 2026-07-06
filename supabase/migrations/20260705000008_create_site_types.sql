-- Migration: 创建站点类型表
CREATE TABLE IF NOT EXISTS site_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  name_i18n JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 更新时间触发器
CREATE OR REPLACE FUNCTION update_site_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_site_types_updated_at ON site_types;
CREATE TRIGGER trigger_update_site_types_updated_at
  BEFORE UPDATE ON site_types
  FOR EACH ROW EXECUTE FUNCTION update_site_types_updated_at();
