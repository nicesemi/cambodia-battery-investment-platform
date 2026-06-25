-- Add images column to franchisee_stores for store photo gallery
ALTER TABLE franchisee_stores ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;
