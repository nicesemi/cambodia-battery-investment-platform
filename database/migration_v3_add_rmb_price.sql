-- 电池资产新增人民币报价字段
-- 2025-06-25

ALTER TABLE battery_assets
ADD COLUMN IF NOT EXISTS unit_price_rmb DECIMAL(12,2);

COMMENT ON COLUMN battery_assets.unit_price_rmb IS '人民币单价（元），管理员录入；unit_price 由系统根据汇率自动换算为 USD';

-- 插入/更新汇率配置（1 USD = ? CNY，如 7.25 表示 1美元=7.25人民币）
INSERT INTO system_configs (config_key, config_value, config_type, description)
VALUES ('exchange_rate_usd_cny', '7.25', 'decimal', '美元兑人民币汇率（1 USD = ? CNY）')
ON CONFLICT (config_key) DO NOTHING;

-- 为已有资产回填 unit_price_rmb（基于当前汇率）
UPDATE battery_assets
SET unit_price_rmb = ROUND(unit_price * 7.25, 2)
WHERE unit_price_rmb IS NULL;
