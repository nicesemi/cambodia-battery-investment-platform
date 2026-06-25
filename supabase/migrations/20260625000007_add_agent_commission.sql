-- Migration: 为 agent_applications 添加佣金/分成等可编辑字段
ALTER TABLE agent_applications ADD COLUMN IF NOT EXISTS commission NUMERIC;
ALTER TABLE agent_applications ADD COLUMN IF NOT EXISTS revenue_share NUMERIC;
ALTER TABLE agent_applications ADD COLUMN IF NOT EXISTS store_count INTEGER DEFAULT 0;
