-- 代理申请表
CREATE TABLE IF NOT EXISTS agent_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    agent_type VARCHAR(50) NOT NULL CHECK (agent_type IN ('province_agent', 'city_franchisee')),
    full_name VARCHAR(200) NOT NULL,
    phone VARCHAR(50),
    region VARCHAR(50),
    city VARCHAR(100),
    parent_agent_id UUID REFERENCES agent_applications(id) ON DELETE SET NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES users(id),
    review_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_agent_applications_user_id ON agent_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_applications_status ON agent_applications(status);
CREATE INDEX IF NOT EXISTS idx_agent_applications_agent_type ON agent_applications(agent_type);

-- 更新时间触发器
CREATE TRIGGER update_agent_applications_updated_at
    BEFORE UPDATE ON agent_applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
