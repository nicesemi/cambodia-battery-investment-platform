-- 为 franchisee_applications 表添加代理审批所需字段
ALTER TABLE franchisee_applications 
ADD COLUMN IF NOT EXISTS parent_agent_id UUID REFERENCES agent_applications(id),
ADD COLUMN IF NOT EXISTS region TEXT,
ADD COLUMN IF NOT EXISTS agent_type TEXT;

-- 为 agent_applications 表添加索引优化审批查询
CREATE INDEX IF NOT EXISTS idx_agent_applications_agent_type_region_status 
ON agent_applications(agent_type, region, status);

CREATE INDEX IF NOT EXISTS idx_agent_applications_parent_agent_id 
ON agent_applications(parent_agent_id);

-- 为 franchisee_applications 添加索引优化代理审批查询
CREATE INDEX IF NOT EXISTS idx_franchisee_applications_parent_agent_id_status 
ON franchisee_applications(parent_agent_id, status);

CREATE INDEX IF NOT EXISTS idx_franchisee_applications_region_status 
ON franchisee_applications(region, status);
