-- 迁移 V7: 电池多站点分配 + 唯一编号 + stock字段
-- 日期: 2026-06-25

BEGIN;

-- 1. battery_assets 添加 stock 列（与 available_units 同步）
ALTER TABLE battery_assets ADD COLUMN IF NOT EXISTS stock INTEGER NOT NULL DEFAULT 0;
UPDATE battery_assets SET stock = available_units WHERE stock = 0;

-- 2. 创建 battery_units 表：每块电池独立记录
CREATE TABLE IF NOT EXISTS battery_units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    battery_asset_id UUID NOT NULL REFERENCES battery_assets(id) ON DELETE CASCADE,
    unit_code VARCHAR(50) UNIQUE NOT NULL,           -- 唯一编号，如 BAT-CAMB-00001
    site_id VARCHAR(100),                            -- 运营站点ID
    site_name VARCHAR(200),                          -- 运营站点名称
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'sold', 'maintenance', 'reserved')),
    investor_id UUID REFERENCES users(id),           -- 购买者
    sensor_battery_level DECIMAL(5,2),               -- 传感器：电量百分比
    sensor_temperature DECIMAL(5,2),                  -- 传感器：温度(°C)
    sensor_cycle_count INTEGER DEFAULT 0,             -- 传感器：循环次数
    sensor_last_online TIMESTAMP WITH TIME ZONE,      -- 传感器：最后在线时间
    sensor_health_status VARCHAR(20) DEFAULT 'normal' CHECK (sensor_health_status IN ('normal', 'warning', 'critical')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. 创建 investor_battery_units 关联表：投资者持有的具体电池
CREATE TABLE IF NOT EXISTS investor_battery_units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    investor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    battery_unit_id UUID NOT NULL REFERENCES battery_units(id) ON DELETE CASCADE,
    battery_asset_id UUID NOT NULL REFERENCES battery_assets(id) ON DELETE CASCADE,
    purchase_price DECIMAL(12,2),                     -- 购买时单价
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(investor_id, battery_unit_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_battery_units_asset_id ON battery_units(battery_asset_id);
CREATE INDEX IF NOT EXISTS idx_battery_units_site_id ON battery_units(site_id);
CREATE INDEX IF NOT EXISTS idx_battery_units_investor ON battery_units(investor_id);
CREATE INDEX IF NOT EXISTS idx_battery_units_status ON battery_units(status);
CREATE INDEX IF NOT EXISTS idx_investor_battery_units_investor ON investor_battery_units(investor_id);
CREATE INDEX IF NOT EXISTS idx_investor_battery_units_unit ON investor_battery_units(battery_unit_id);

-- 触发器：自动更新 updated_at
CREATE TRIGGER update_battery_units_updated_at BEFORE UPDATE ON battery_units
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
