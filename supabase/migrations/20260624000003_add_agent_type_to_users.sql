-- Add agent_type column to users table for province_agent / city_franchisee distinction
ALTER TABLE users ADD COLUMN IF NOT EXISTS agent_type TEXT;

-- Backfill agent_type from approved agent_applications
UPDATE users SET agent_type = aa.agent_type
FROM agent_applications aa
WHERE users.id = aa.user_id
  AND aa.status = 'approved'
  AND aa.agent_type IN ('province_agent', 'city_franchisee');

-- Fix agent_code for city_franchisee: FRA prefix instead of AGT
-- (AGT should be reserved for province_agent; city_franchisee uses FRA prefix)
-- Note: the sequence agent_applications_franchisee_code_seq already exists for FRA prefix
UPDATE agent_applications 
SET agent_code = 'FRA-' || LPAD(SUBSTRING(agent_code FROM '[0-9]+'), 5, '0')
WHERE agent_type = 'city_franchisee'
  AND agent_code LIKE 'AGT-%';

-- Ensure future city_franchisee approvals use FRA prefix
-- (triggers should already handle this based on existing migration 20240624003)
