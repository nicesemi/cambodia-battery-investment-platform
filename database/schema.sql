-- 柬埔寨换电虚拟资产投资平台数据库Schema
-- PostgreSQL 14+

-- 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 用户表
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(200),
    phone VARCHAR(50),
    country VARCHAR(100) DEFAULT 'China',
    language VARCHAR(10) DEFAULT 'zh',
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'operator', 'investor', 'franchisee')),
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    kyc_status VARCHAR(20) DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'approved', 'rejected')),
    total_investment DECIMAL(15,2) DEFAULT 0,
    total_dividends DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 用户钱包表
CREATE TABLE user_wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    balance DECIMAL(15,2) DEFAULT 0,
    frozen_balance DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'USD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, currency)
);

-- 电池资产表
CREATE TABLE battery_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    name_i18n JSONB,
    description TEXT,
    description_i18n JSONB,
    battery_type VARCHAR(50) DEFAULT '72V50Ah',
    total_units INTEGER NOT NULL,
    available_units INTEGER NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    unit_price DECIMAL(12,2) NOT NULL,
    unit_price_rmb DECIMAL(12,2),
    expected_roi DECIMAL(5,2) NOT NULL, -- 预期年化收益率
    location VARCHAR(100) DEFAULT 'Cambodia',
    station_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'closed', 'maintenance')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 用户持有资产表
CREATE TABLE user_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES battery_assets(id) ON DELETE CASCADE,
    units INTEGER NOT NULL,
    average_cost DECIMAL(12,2) NOT NULL,
    total_dividends_received DECIMAL(15,2) DEFAULT 0,
    is_tradable BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, asset_id)
);

-- 电池独立单元表（每块电池唯一编号，支持多站点分布）
CREATE TABLE battery_units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    battery_asset_id UUID NOT NULL REFERENCES battery_assets(id) ON DELETE CASCADE,
    unit_code VARCHAR(50) UNIQUE NOT NULL,
    site_id VARCHAR(100),
    site_name VARCHAR(200),
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'sold', 'maintenance', 'reserved')),
    investor_id UUID REFERENCES users(id),
    sensor_battery_level DECIMAL(5,2),
    sensor_temperature DECIMAL(5,2),
    sensor_cycle_count INTEGER DEFAULT 0,
    sensor_last_online TIMESTAMP WITH TIME ZONE,
    sensor_health_status VARCHAR(20) DEFAULT 'normal' CHECK (sensor_health_status IN ('normal', 'warning', 'critical')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 投资者持有电池单元关联表
CREATE TABLE investor_battery_units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    investor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    battery_unit_id UUID NOT NULL REFERENCES battery_units(id) ON DELETE CASCADE,
    battery_asset_id UUID NOT NULL REFERENCES battery_assets(id) ON DELETE CASCADE,
    purchase_price DECIMAL(12,2),
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(investor_id, battery_unit_id)
);

-- 交易订单表
CREATE TABLE trade_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_no VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES battery_assets(id) ON DELETE CASCADE,
    order_type VARCHAR(10) NOT NULL CHECK (order_type IN ('buy', 'sell')),
    price DECIMAL(12,2) NOT NULL,
    units INTEGER NOT NULL,
    filled_units INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'filled', 'cancelled', 'rejected')),
    order_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    filled_time TIMESTAMP WITH TIME ZONE,
    cancelled_time TIMESTAMP WITH TIME ZONE
);

-- 交易记录表
CREATE TABLE trade_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trade_no VARCHAR(50) UNIQUE NOT NULL,
    buy_order_id UUID REFERENCES trade_orders(id),
    sell_order_id UUID REFERENCES trade_orders(id),
    asset_id UUID REFERENCES battery_assets(id),
    buyer_id UUID REFERENCES users(id),
    seller_id UUID REFERENCES users(id),
    price DECIMAL(12,2) NOT NULL,
    units INTEGER NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    fee DECIMAL(10,2) DEFAULT 0,
    trade_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 分红记录表
CREATE TABLE dividend_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dividend_no VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES battery_assets(id),
    period VARCHAR(20) NOT NULL, -- 分红周期: 2024-01
    units_held INTEGER NOT NULL,
    profit_amount DECIMAL(15,2) NOT NULL,
    dividend_amount DECIMAL(15,2) NOT NULL, -- 70%分给用户
    platform_fee DECIMAL(15,2) NOT NULL, -- 30%平台费用
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    distributed_at TIMESTAMP WITH TIME ZONE
);

-- 平台利润表
CREATE TABLE platform_profits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    period VARCHAR(20) UNIQUE NOT NULL,
    total_revenue DECIMAL(15,2) NOT NULL, -- 总收入
    total_cost DECIMAL(15,2) NOT NULL, -- 总成本
    gross_profit DECIMAL(15,2) NOT NULL, -- 毛利润
    operating_cost DECIMAL(15,2) NOT NULL, -- 运营成本
    net_profit DECIMAL(15,2) NOT NULL, -- 净利润
    investor_share DECIMAL(15,2) NOT NULL, -- 投资者分红总额(70%)
    platform_share DECIMAL(15,2) NOT NULL, -- 平台留存(30%)
    exchange_stations INTEGER NOT NULL, -- 换电站数量
    battery_count INTEGER NOT NULL, -- 电池数量
    swap_count INTEGER NOT NULL, -- 换电次数
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 换电站数据统计表
CREATE TABLE station_statistics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_id VARCHAR(100) NOT NULL,
    station_name VARCHAR(200),
    location VARCHAR(200),
    date DATE NOT NULL,
    swap_count INTEGER DEFAULT 0,
    revenue DECIMAL(12,2) DEFAULT 0,
    battery_health_avg DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(station_id, date)
);

-- 充值提现记录表
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tx_no VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'withdraw', 'dividend', 'trade', 'fee')),
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    payment_method VARCHAR(50),
    tx_hash VARCHAR(255),
    remark TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 系统配置表
CREATE TABLE system_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT,
    config_type VARCHAR(20) DEFAULT 'string',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 操作日志表
CREATE TABLE operation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    module VARCHAR(50),
    ip_address VARCHAR(50),
    user_agent TEXT,
    request_data JSONB,
    response_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_user_assets_user_id ON user_assets(user_id);
CREATE INDEX idx_battery_units_asset_id ON battery_units(battery_asset_id);
CREATE INDEX idx_battery_units_site_id ON battery_units(site_id);
CREATE INDEX idx_battery_units_investor ON battery_units(investor_id);
CREATE INDEX idx_battery_units_status ON battery_units(status);
CREATE INDEX idx_investor_battery_units_investor ON investor_battery_units(investor_id);
CREATE INDEX idx_investor_battery_units_unit ON investor_battery_units(battery_unit_id);
CREATE INDEX idx_trade_orders_user_id ON trade_orders(user_id);
CREATE INDEX idx_trade_orders_status ON trade_orders(status);
CREATE INDEX idx_dividend_records_user_id ON dividend_records(user_id);
CREATE INDEX idx_dividend_records_period ON dividend_records(period);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_station_statistics_date ON station_statistics(date);

-- 更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要的表添加更新时间触发器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_wallets_updated_at BEFORE UPDATE ON user_wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_battery_assets_updated_at BEFORE UPDATE ON battery_assets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_assets_updated_at BEFORE UPDATE ON user_assets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_battery_units_updated_at BEFORE UPDATE ON battery_units FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_configs_updated_at BEFORE UPDATE ON system_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 插入初始系统配置
INSERT INTO system_configs (config_key, config_value, config_type, description) VALUES
('profit_share_ratio', '0.70', 'decimal', '投资者利润分红比例'),
('platform_fee_ratio', '0.30', 'decimal', '平台留存比例'),
('trade_fee_rate', '0.005', 'decimal', '交易手续费率'),
('min_withdraw_amount', '100', 'decimal', '最低提现金额'),
('battery_unit_price', '1000', 'decimal', '电池资产单价(USD)'),
('expected_roi_yearly', '0.15', 'decimal', '预期年化收益率'),
('exchange_rate_usd_khr', '4100', 'integer', '美元兑瑞尔汇率');

-- 插入初始资产数据
INSERT INTO battery_assets (asset_code, name, description, battery_type, total_units, available_units, unit_price, expected_roi, location, status) VALUES
('BAT-CAMB-001', '金边核心区电池包A', '柬埔寨金边核心商业区换电站电池资产，72V50Ah锂电池', '72V50Ah', 1000, 1000, 1000.00, 15.50, 'Phnom Penh', 'active'),
('BAT-CAMB-002', '暹粒旅游区电池包B', '柬埔寨暹粒旅游区换电站电池资产，覆盖游客电摩需求', '72V50Ah', 500, 500, 1000.00, 16.20, 'Siem Reap', 'active'),
('BAT-CAMB-003', '西哈努克港电池包C', '柬埔寨西哈努克港口工业区电池资产', '72V50Ah', 800, 800, 1000.00, 14.80, 'Sihanoukville', 'active');

-- 创建管理员用户 (密码: admin123, 需要在应用中使用bcrypt加密)
INSERT INTO users (email, username, password_hash, full_name, role, is_verified, is_active) VALUES
('admin@battery-invest.com', 'admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '系统管理员', 'admin', true, true);
