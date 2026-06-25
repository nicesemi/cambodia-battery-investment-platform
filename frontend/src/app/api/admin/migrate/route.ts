import { supabase, getSupabaseAdmin } from '@/lib/supabase'
import { authenticateToken } from '@/lib/auth'
import { ok, unauthorized, serverError } from '@/lib/response'

export const dynamic = 'force-dynamic'

/** 执行单条 SQL（逐条 RPC 调用） */
async function execSQL(adminClient: any, sql: string): Promise<{ sql: string; error?: string }> {
  const { error } = await adminClient.rpc('exec_sql_migration', { sql }).maybeSingle()
  if (error) return { sql, error: error.message }
  return { sql }
}

/**
 * Database migration endpoint
 * POST /api/admin/migrate          — 完整迁移（历史兼容）
 * POST /api/admin/migrate?action=entity-codes  — 仅实体编码迁移
 */
export async function POST(request: Request) {
  try {
    const user = await authenticateToken(request)
    if (!user || user.role !== 'admin') return unauthorized('Admin only')

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'full'

    const adminClient = getSupabaseAdmin()
    const results: { sql: string; error?: string }[] = []

    if (action === 'entity-codes') {
      // ----- 实体编码迁移 (4 实体) -----
      const statements = [
        // 序列
        `CREATE SEQUENCE IF NOT EXISTS investor_code_seq START 1`,
        `CREATE SEQUENCE IF NOT EXISTS store_code_seq START 1`,
        `CREATE SEQUENCE IF NOT EXISTS franchisee_code_seq START 1`,
        `CREATE SEQUENCE IF NOT EXISTS agent_code_seq START 1`,
        // 列
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS investor_code TEXT UNIQUE`,
        `ALTER TABLE franchisee_stores ADD COLUMN IF NOT EXISTS store_code TEXT UNIQUE`,
        `ALTER TABLE franchisee_applications ADD COLUMN IF NOT EXISTS franchisee_code TEXT UNIQUE`,
        `ALTER TABLE agent_applications ADD COLUMN IF NOT EXISTS agent_code TEXT UNIQUE`,
        // 回填
        `UPDATE users SET investor_code = 'INV-' || LPAD(nextval('investor_code_seq')::TEXT, 5, '0') WHERE role = 'investor' AND investor_code IS NULL`,
        `UPDATE franchisee_stores SET store_code = 'STORE-' || LPAD(nextval('store_code_seq')::TEXT, 5, '0') WHERE store_code IS NULL`,
        `UPDATE franchisee_applications SET franchisee_code = 'FRA-' || LPAD(nextval('franchisee_code_seq')::TEXT, 5, '0') WHERE status = 'approved' AND franchisee_code IS NULL`,
        `UPDATE agent_applications SET agent_code = 'AGT-' || LPAD(nextval('agent_code_seq')::TEXT, 5, '0') WHERE status = 'approved' AND agent_code IS NULL`,
        // 触发器函数
        `CREATE OR REPLACE FUNCTION trg_store_code() RETURNS TRIGGER AS $$ BEGIN IF NEW.store_code IS NULL THEN NEW.store_code := 'STORE-' || LPAD(nextval('store_code_seq')::TEXT, 5, '0'); END IF; RETURN NEW; END; $$ LANGUAGE plpgsql`,
        `DROP TRIGGER IF EXISTS trg_store_code_trigger ON franchisee_stores`,
        `CREATE TRIGGER trg_store_code_trigger BEFORE INSERT ON franchisee_stores FOR EACH ROW EXECUTE FUNCTION trg_store_code()`,
        // 索引
        `CREATE INDEX IF NOT EXISTS idx_franchisee_stores_store_code ON franchisee_stores(store_code)`,
      ]

      for (const sql of statements) {
        results.push(await execSQL(adminClient, sql))
      }
      return ok({ action: 'entity-codes', results })
    }

    // ----- 完整迁移（历史兼容） -----

    // 1. store_code 列 + 序列 + 回填 + 触发器
    for (const sql of [
      `CREATE SEQUENCE IF NOT EXISTS store_code_seq START 1`,
      `ALTER TABLE franchisee_stores ADD COLUMN IF NOT EXISTS store_code TEXT UNIQUE`,
      `UPDATE franchisee_stores SET store_code = 'STORE-' || LPAD(nextval('store_code_seq')::TEXT, 5, '0') WHERE store_code IS NULL`,
      `CREATE OR REPLACE FUNCTION trg_store_code() RETURNS TRIGGER AS $$ BEGIN IF NEW.store_code IS NULL THEN NEW.store_code := 'STORE-' || LPAD(nextval('store_code_seq')::TEXT, 5, '0'); END IF; RETURN NEW; END; $$ LANGUAGE plpgsql`,
      `DROP TRIGGER IF EXISTS trg_store_code_trigger ON franchisee_stores`,
      `CREATE TRIGGER trg_store_code_trigger BEFORE INSERT ON franchisee_stores FOR EACH ROW EXECUTE FUNCTION trg_store_code()`,
      `CREATE INDEX IF NOT EXISTS idx_franchisee_stores_store_code ON franchisee_stores(store_code)`,
    ]) {
      results.push(await execSQL(adminClient, sql))
    }

    // 2. investor_store_bindings
    results.push(await execSQL(adminClient,
      `CREATE TABLE IF NOT EXISTS investor_store_bindings (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        investor_id UUID REFERENCES users(id) ON DELETE CASCADE,
        store_id UUID REFERENCES franchisee_stores(id) ON DELETE CASCADE,
        bound_by UUID REFERENCES users(id),
        bound_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(investor_id, store_id)
      )`
    ))

    // 3. store_performance
    results.push(await execSQL(adminClient,
      `CREATE TABLE IF NOT EXISTS store_performance (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        store_id UUID REFERENCES franchisee_stores(id) ON DELETE CASCADE UNIQUE,
        total_sales DECIMAL(15,2) DEFAULT 0,
        total_commission DECIMAL(15,2) DEFAULT 0,
        total_rental_income DECIMAL(15,2) DEFAULT 0,
        order_count INTEGER DEFAULT 0,
        investor_count INTEGER DEFAULT 0,
        updated_at TIMESTAMPTZ DEFAULT now()
      )`
    ))

    // 4. agent_applications
    results.push(await execSQL(adminClient,
      `CREATE TABLE IF NOT EXISTS agent_applications (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        agent_type TEXT NOT NULL,
        full_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        region TEXT NOT NULL,
        city TEXT,
        reason TEXT,
        status TEXT DEFAULT 'pending',
        reviewed_by UUID REFERENCES users(id),
        review_note TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )`
    ))

    // 5. franchisee_applications 列
    results.push(await execSQL(adminClient, `ALTER TABLE franchisee_applications ADD COLUMN IF NOT EXISTS parent_agent_id UUID REFERENCES users(id)`))
    results.push(await execSQL(adminClient, `ALTER TABLE franchisee_applications ADD COLUMN IF NOT EXISTS agent_type TEXT`))

    // 6. RLS
    for (const tbl of ['investor_store_bindings', 'store_performance', 'agent_applications']) {
      results.push(await execSQL(adminClient, `ALTER TABLE ${tbl} ENABLE ROW LEVEL SECURITY`))
    }

    return ok({ success: true, action: 'full', results })
  } catch (e: any) {
    return serverError(`Migration error: ${e.message || 'unknown'}`)
  }
}
