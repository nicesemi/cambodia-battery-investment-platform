-- 电池类型维护表
-- Migration v4: 新增电池类型管理

CREATE TABLE IF NOT EXISTS battery_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    voltage VARCHAR(50),
    capacity VARCHAR(50),
    chemistry VARCHAR(100),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 更新时间触发器
CREATE TRIGGER update_battery_types_updated_at BEFORE UPDATE ON battery_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 插入初始电池类型数据
INSERT INTO battery_types (name, voltage, capacity, chemistry, description, sort_order) VALUES
('72V50Ah', '72V', '50Ah', '三元锂', '72V50Ah锂电池，适用于外卖骑手电摩', 1),
('72V100Ah', '72V', '100Ah', '三元锂', '72V100Ah大容量锂电池，长续航', 2),
('60V20Ah', '60V', '20Ah', '磷酸铁锂', '60V20Ah磷酸铁锂电池，高安全性', 3),
('60V32Ah', '60V', '32Ah', '磷酸铁锂', '60V32Ah磷酸铁锂电池，中长续航', 4),
('48V20Ah', '48V', '20Ah', '三元锂', '48V20Ah锂电池，适用于轻型电摩', 5),
('48V12Ah', '48V', '12Ah', '磷酸铁锂', '48V12Ah磷酸铁锂电池，经济型', 6),
('36V10Ah', '36V', '10Ah', '三元锂', '36V10Ah锂电池，电动自行车', 7)
ON CONFLICT (name) DO NOTHING;
