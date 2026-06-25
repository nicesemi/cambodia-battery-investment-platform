-- Migration v6: 电池类型增加照片上传字段
-- 新增 image_url 列，支持后台录入电池照片

ALTER TABLE battery_types ADD COLUMN IF NOT EXISTS image_url TEXT;
