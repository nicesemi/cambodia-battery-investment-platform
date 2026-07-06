import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// TEMPORARY: 执行数据库迁移后删除此文件
export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const results = [];
  
  const sqls = [
    `ALTER TABLE franchisee_applications ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC DEFAULT 0`,
    `ALTER TABLE franchisee_applications ADD COLUMN IF NOT EXISTS performance_target NUMERIC DEFAULT 1000000`,
    `ALTER TABLE franchisee_applications ADD COLUMN IF NOT EXISTS cumulative_performance NUMERIC DEFAULT 0`,
    `ALTER TABLE agent_applications ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC DEFAULT 0`,
    `ALTER TABLE agent_applications ADD COLUMN IF NOT EXISTS performance_target NUMERIC DEFAULT 5000000`,
    `ALTER TABLE agent_applications ADD COLUMN IF NOT EXISTS cumulative_performance NUMERIC DEFAULT 0`,
    `UPDATE agent_applications SET performance_target = 10000000 WHERE agent_type = 'province_agent' AND performance_target = 5000000`,
    `ALTER TABLE franchisee_stores ADD COLUMN IF NOT EXISTS store_type VARCHAR(20) DEFAULT 'franchised'`,
  ];

  for (const sql of sqls) {
    const { error } = await supabase.rpc('exec_raw_sql', { query: sql }).maybeSingle();
    if (error) {
      results.push({ sql: sql.substring(0, 60) + '...', error: error.message });
    } else {
      results.push({ sql: sql.substring(0, 60) + '...', status: 'ok' });
    }
  }

  return NextResponse.json({ results });
}
