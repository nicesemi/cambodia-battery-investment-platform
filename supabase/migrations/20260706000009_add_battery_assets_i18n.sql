-- battery_assets 多语言字段添加
-- Migration v9: 新增 name_i18n / description_i18n 字段

-- Step 1: 添加 JSONB 多语言字段
ALTER TABLE battery_assets ADD COLUMN IF NOT EXISTS name_i18n JSONB;
ALTER TABLE battery_assets ADD COLUMN IF NOT EXISTS description_i18n JSONB;

-- Step 2: 将现有数据迁移到 i18n 字段（现有 name → name_i18n.zh-CN）
UPDATE battery_assets
SET name_i18n = jsonb_build_object('zh-CN', name)
WHERE name IS NOT NULL AND name_i18n IS NULL;

-- description → description_i18n.zh-CN
UPDATE battery_assets
SET description_i18n = jsonb_build_object('zh-CN', description)
WHERE description IS NOT NULL AND description_i18n IS NULL;

-- Note: 保留原字段 name/description 不做改动，用于向后兼容
