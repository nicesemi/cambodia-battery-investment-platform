# 运营站点管理 "修改站点" load failed 修复报告

**日期**：2026-07-11
**影响范围**：`/admin/operation-sites` — 编辑站点（PUT）和删除站点（DELETE）

---

## 诊断结论

### 根因：PUT/DELETE handler 使用了 anon key 而非 service_role key

对比代码库中其他 admin API 路由（如 `warehouses/[id]/route.ts`、`dispatch/route.ts`），它们对写操作统一使用 `getSupabaseAdmin()`（service_role key），而 `operation-sites/[siteId]/route.ts` 的 PUT 和 DELETE handler 直接使用 `supabase` 客户端（anon key）。

| 文件 | 操作 | 修复前 | 其他 admin API |
|---|---|---|---|
| `[siteId]/route.ts` | PUT | `supabase` (anon) | `getSupabaseAdmin()` |
| `[siteId]/route.ts` | DELETE | `supabase` (anon) | `getSupabaseAdmin()` |
| `route.ts` | POST | `supabase` (anon) | `getSupabaseAdmin()` |

若 `operation_sites` 表配置了 RLS（Row Level Security）策略限制写操作仅允许 `service_role` 或已认证管理员，anon key 的 UPDATE/DELETE/INSERT 会被 Supabase 拒绝（PostgreSQL error code `42501`），返回 500 错误，前端显示 "load failed"。

### 附带问题：`_i18n` 多语言字段被静默丢弃

前端提交表单时包含 `name_i18n`、`country_i18n`、`city_i18n`（JSON 字符串），但 PUT 和 POST handler 均未解析并写入数据库，导致用户在编辑表单中修改多语言名称后保存无效。

---

## 修复内容

### 1. `src/app/api/admin/operation-sites/[siteId]/route.ts`

- 导入 `getSupabaseAdmin`
- PUT handler：提取 `name_i18n`/`country_i18n`/`city_i18n`，解析 JSON 后写入 `updates` 对象
- PUT handler：`supabase` → `getSupabaseAdmin()` 执行 `.update()`
- DELETE handler：`supabase` → `getSupabaseAdmin()` 执行 `.delete()`

### 2. `src/app/api/admin/operation-sites/route.ts`

- POST handler：提取并解析 `_i18n` 字段，加入 `insertData`
- POST handler：`supabase` → `getSupabaseAdmin()` 执行 `.insert()`

### 3. `frontend/src/` 同步修复

`frontend/frontend/src/` 目录下相同文件已同步覆盖。

---

## 修改文件清单

1. `src/app/api/admin/operation-sites/[siteId]/route.ts`
2. `src/app/api/admin/operation-sites/route.ts`
3. `frontend/src/app/api/admin/operation-sites/[siteId]/route.ts`
4. `frontend/src/app/api/admin/operation-sites/route.ts`
