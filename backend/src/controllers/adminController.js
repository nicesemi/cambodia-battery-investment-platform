const db = require('../config/database');

// 获取管理面板统计数据
const getDashboardStats = async (req, res) => {
  try {
    // 用户统计
    const userStats = await db.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_users_30d,
        COUNT(CASE WHEN kyc_status = 'approved' THEN 1 END) as verified_users,
        SUM(total_investment) as total_investment,
        SUM(total_dividends) as total_dividends_distributed
      FROM users
    `);

    // 资产统计
    const assetStats = await db.query(`
      SELECT 
        COUNT(*) as total_assets,
        SUM(total_units) as total_units,
        SUM(available_units) as available_units,
        SUM(total_units - available_units) as sold_units
      FROM battery_assets
    `);

    // 交易统计
    const tradeStats = await db.query(`
      SELECT 
        COUNT(*) as total_trades,
        COUNT(CASE WHEN trade_time >= NOW() - INTERVAL '24 hours' THEN 1 END) as trades_24h,
        SUM(total_amount) as total_trade_volume,
        SUM(fee) as total_fees_collected
      FROM trade_records
    `);

    // 分红统计
    const dividendStats = await db.query(`
      SELECT 
        COUNT(*) as total_dividends,
        SUM(dividend_amount) as total_dividend_amount,
        COUNT(DISTINCT period) as dividend_periods
      FROM dividend_records
    `);

    // 最近交易
    const recentTrades = await db.query(`
      SELECT tr.*, u_buyer.username as buyer_name, u_seller.username as seller_name, ba.name as asset_name
      FROM trade_records tr
      JOIN users u_buyer ON tr.buyer_id = u_buyer.id
      JOIN users u_seller ON tr.seller_id = u_seller.id
      JOIN battery_assets ba ON tr.asset_id = ba.id
      ORDER BY tr.trade_time DESC
      LIMIT 10
    `);

    // 最近注册用户
    const recentUsers = await db.query(`
      SELECT id, email, username, full_name, total_investment, total_dividends, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 10
    `);

    // 月度数据（图表用）
    const monthlyData = await db.query(`
      SELECT 
        TO_CHAR(date_trunc('month', created_at), 'YYYY-MM') as month,
        COUNT(*) as new_users,
        SUM(total_investment) as investment_amount
      FROM users
      WHERE created_at >= NOW() - INTERVAL '12 months'
      GROUP BY month
      ORDER BY month
    `);

    // 利润历史
    const profitHistory = await db.query(`
      SELECT *
      FROM platform_profits
      ORDER BY period DESC
      LIMIT 12
    `);

    res.json({
      users: userStats.rows[0],
      assets: assetStats.rows[0],
      trades: tradeStats.rows[0],
      dividends: dividendStats.rows[0],
      recentTrades: recentTrades.rows,
      recentUsers: recentUsers.rows,
      monthlyData: monthlyData.rows,
      profitHistory: profitHistory.rows,
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 获取所有用户
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT id, email, username, full_name, phone, role, kyc_status, 
             is_active, total_investment, total_dividends, created_at
      FROM users
    `;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      query += ` WHERE email ILIKE $${params.length} OR username ILIKE $${params.length}`;
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), offset);

    const result = await db.query(query, params);

    const countResult = await db.query('SELECT COUNT(*) FROM users');

    res.json({
      users: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 更新用户状态
const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { is_active, role, kyc_status } = req.body;

    const result = await db.query(
      `UPDATE users 
       SET is_active = COALESCE($1, is_active),
           role = COALESCE($2, role),
           kyc_status = COALESCE($3, kyc_status)
       WHERE id = $4
       RETURNING id, email, username, role, is_active, kyc_status`,
      [is_active, role, kyc_status, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User updated successfully',
      user: result.rows[0],
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 获取所有交易记录
const getAllTrades = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await db.query(
      `SELECT tr.*, u_buyer.username as buyer_name, u_seller.username as seller_name, ba.name as asset_name
       FROM trade_records tr
       JOIN users u_buyer ON tr.buyer_id = u_buyer.id
       JOIN users u_seller ON tr.seller_id = u_seller.id
       JOIN battery_assets ba ON tr.asset_id = ba.id
       ORDER BY tr.trade_time DESC
       LIMIT $1 OFFSET $2`,
      [parseInt(limit), offset]
    );

    const countResult = await db.query('SELECT COUNT(*) FROM trade_records');

    res.json({
      trades: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error('Get all trades error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 获取系统配置
const getSystemConfigs = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM system_configs ORDER BY config_key'
    );

    res.json({ configs: result.rows });
  } catch (error) {
    console.error('Get system configs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 更新系统配置
const updateSystemConfig = async (req, res) => {
  try {
    const { configKey } = req.params;
    const { configValue } = req.body;

    const result = await db.query(
      `UPDATE system_configs 
       SET config_value = $1, updated_at = CURRENT_TIMESTAMP
       WHERE config_key = $2
       RETURNING *`,
      [configValue, configKey]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Config not found' });
    }

    res.json({
      message: 'Config updated successfully',
      config: result.rows[0],
    });
  } catch (error) {
    console.error('Update config error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============ 资产管理 ============

// 获取所有资产（管理视图，含已关闭/维护中的）
const getAllAssets = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, asset_code, name, description, battery_type, total_units,
              available_units, stock, unit_price, unit_price_rmb, expected_roi, location, station_id,
              status, created_at, updated_at,
              (total_units - available_units) as sold_units
       FROM battery_assets
       ORDER BY created_at DESC`
    );

    // 获取每个资产的站点分布
    const assets = await Promise.all(result.rows.map(async (a) => {
      const sitesResult = await db.query(
        `SELECT site_id, site_name, COUNT(*) as unit_count,
                COUNT(CASE WHEN status = 'available' THEN 1 END) as available_count,
                COUNT(CASE WHEN status = 'sold' THEN 1 END) as sold_count
         FROM battery_units
         WHERE battery_asset_id = $1
         GROUP BY site_id, site_name
         ORDER BY site_name`,
        [a.id]
      );
      return { ...a, site_distribution: sitesResult.rows };
    }));

    res.json({ assets });
  } catch (error) {
    console.error('Get all assets error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 创建资产
const createAsset = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const { asset_code, name, description, battery_type, total_units, unit_price, unit_price_rmb, expected_roi, location, station_id } = req.body;

    if (!asset_code || !name || !total_units || !unit_price || !expected_roi) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Missing required fields: asset_code, name, total_units, unit_price, expected_roi' });
    }

    const result = await client.query(
      `INSERT INTO battery_assets (asset_code, name, description, battery_type, total_units, available_units, stock, unit_price, unit_price_rmb, expected_roi, location, station_id, status)
       VALUES ($1, $2, $3, $4, $5, $5, $5, $6, $7, $8, $9, $10, 'active')
       RETURNING *`,
      [asset_code, name, description, battery_type, total_units, unit_price, unit_price_rmb, expected_roi, location, station_id]
    );

    const newAsset = result.rows[0];

    // 自动生成 battery_units 记录：每块电池一个唯一编号
    const totalUnits = parseInt(total_units);
    const unitRecords = [];
    for (let i = 1; i <= totalUnits; i++) {
      const unitCode = `${asset_code}-${String(i).padStart(5, '0')}`;
      unitRecords.push(`('${newAsset.id}', '${unitCode}', '${station_id || ''}', '${location || ''}')`);
    }

    // 分批插入（每批最多500条）
    const batchSize = 500;
    for (let i = 0; i < unitRecords.length; i += batchSize) {
      const batch = unitRecords.slice(i, i + batchSize).join(', ');
      await client.query(
        `INSERT INTO battery_units (battery_asset_id, unit_code, site_id, site_name) VALUES ${batch}`
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: `Asset created with ${totalUnits} battery units`,
      asset: newAsset,
      units_generated: totalUnits,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Asset code already exists' });
    }
    console.error('Create asset error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

// 更新资产
const updateAsset = async (req, res) => {
  try {
    const { assetId } = req.params;
    const { name, description, battery_type, total_units, unit_price, expected_roi, location, station_id, status } = req.body;

    // 动态构建 SET 子句
    const fields = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) { fields.push(`name = $${idx++}`); values.push(name); }
    if (description !== undefined) { fields.push(`description = $${idx++}`); values.push(description); }
    if (battery_type !== undefined) { fields.push(`battery_type = $${idx++}`); values.push(battery_type); }
    if (total_units !== undefined) {
      // 如果修改 total_units，需要同步调整 available_units 和 stock
      const current = await db.query('SELECT total_units, available_units, stock FROM battery_assets WHERE id = $1', [assetId]);
      if (current.rows.length === 0) return res.status(404).json({ error: 'Asset not found' });
      const diff = total_units - current.rows[0].total_units;
      const newAvailable = current.rows[0].available_units + diff;
      const newStock = current.rows[0].stock + diff;
      fields.push(`total_units = $${idx++}`); values.push(total_units);
      fields.push(`available_units = $${idx++}`); values.push(Math.max(0, newAvailable));
      fields.push(`stock = $${idx++}`); values.push(Math.max(0, newStock));
    }
    if (unit_price !== undefined) { fields.push(`unit_price = $${idx++}`); values.push(unit_price); }
    if (expected_roi !== undefined) { fields.push(`expected_roi = $${idx++}`); values.push(expected_roi); }
    if (location !== undefined) { fields.push(`location = $${idx++}`); values.push(location); }
    if (station_id !== undefined) { fields.push(`station_id = $${idx++}`); values.push(station_id); }
    if (status !== undefined) { fields.push(`status = $${idx++}`); values.push(status); }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(assetId);
    const result = await db.query(
      `UPDATE battery_assets SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    res.json({ message: 'Asset updated', asset: result.rows[0] });
  } catch (error) {
    console.error('Update asset error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 变更资产状态（上线/下架/维护中）
const updateAssetStatus = async (req, res) => {
  try {
    const { assetId } = req.params;
    const { status } = req.body;

    const validStatuses = ['active', 'paused', 'closed', 'maintenance'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const result = await db.query(
      `UPDATE battery_assets SET status = $1 WHERE id = $2 RETURNING *`,
      [status, assetId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    res.json({ message: `Asset status updated to ${status}`, asset: result.rows[0] });
  } catch (error) {
    console.error('Update asset status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 删除资产（软删除 - 标记为 closed）
const deleteAsset = async (req, res) => {
  try {
    const { assetId } = req.params;
    const result = await db.query(
      `UPDATE battery_assets SET status = 'closed' WHERE id = $1 AND status != 'closed' RETURNING *`,
      [assetId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Asset not found or already closed' });
    }
    res.json({ message: 'Asset closed (soft-deleted)', asset: result.rows[0] });
  } catch (error) {
    console.error('Delete asset error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============ 代理商/加盟商审批 ============

// 获取所有代理申请
const getAgentApplications = async (req, res) => {
  try {
    const { status } = req.query;
    let query = `SELECT aa.*, u.username, u.email
                 FROM agent_applications aa
                 JOIN users u ON u.id = aa.user_id`;
    const params = [];
    if (status) {
      params.push(status);
      query += ` WHERE aa.status = $1`;
    }
    query += ` ORDER BY aa.created_at DESC`;
    const result = await db.query(query, params);
    res.json({ applications: result.rows });
  } catch (error) {
    console.error('Get agent applications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 审批代理申请
const reviewAgentApplication = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const { applicationId } = req.params;
    const { status, review_note } = req.body; // status: 'approved' | 'rejected'

    if (!['approved', 'rejected'].includes(status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'status must be approved or rejected' });
    }

    const appResult = await client.query(
      `UPDATE agent_applications
       SET status = $1, reviewed_by = $2, review_note = $3, updated_at = now()
       WHERE id = $4
       RETURNING *`,
      [status, req.user.id, review_note || null, applicationId]
    );

    if (appResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Application not found' });
    }

    const app = appResult.rows[0];

    // 审批通过 → 升级用户角色
    if (status === 'approved') {
      const newRole = app.agent_type === 'province_agent' ? 'franchisee' : 'franchisee';
      await client.query(
        'UPDATE users SET role = $1 WHERE id = $2',
        [newRole, app.user_id]
      );
    }

    await client.query('COMMIT');

    res.json({ message: `申请已${status === 'approved' ? '通过' : '驳回'}`, application: app });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Review agent application error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

// 获取所有加盟商申请
const getFranchiseeApplications = async (req, res) => {
  try {
    const { status } = req.query;
    let query = `SELECT fa.*, u.username, u.email
                 FROM franchisee_applications fa
                 JOIN users u ON u.id = fa.user_id`;
    const params = [];
    if (status) {
      params.push(status);
      query += ` WHERE fa.status = $1`;
    }
    query += ` ORDER BY fa.created_at DESC`;
    const result = await db.query(query, params);
    res.json({ applications: result.rows });
  } catch (error) {
    console.error('Get franchisee applications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 审批加盟商申请
const reviewFranchiseeApplication = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const { applicationId } = req.params;
    const { status, review_note } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'status must be approved or rejected' });
    }

    const appResult = await client.query(
      `UPDATE franchisee_applications
       SET status = $1, reviewed_by = $2, review_note = $3, updated_at = now()
       WHERE id = $4
       RETURNING *`,
      [status, req.user.id, review_note || null, applicationId]
    );

    if (appResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Application not found' });
    }

    const app = appResult.rows[0];

    // 审批通过 → 创建门店
    if (status === 'approved') {
      await client.query(
        `INSERT INTO franchisee_stores (owner_id, name, city, address, phone, status)
         VALUES ($1, $2, $3, $4, $5, 'active')
         ON CONFLICT DO NOTHING`,
        [app.user_id, app.store_name, app.city, app.address, app.phone]
      );
      // 升级用户角色
      await client.query(
        'UPDATE users SET role = $1 WHERE id = $2',
        ['franchisee', app.user_id]
      );
    }

    await client.query('COMMIT');

    res.json({ message: `申请已${status === 'approved' ? '通过' : '驳回'}`, application: app });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Review franchisee application error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

// 站点类型管理
const getSiteTypes = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM site_types ORDER BY created_at ASC');
    res.json({ site_types: result.rows });
  } catch (error) {
    console.error('Get site types error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createSiteType = async (req, res) => {
  try {
    const { name, name_i18n } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: '编码名称不能为空' });
    const result = await db.query(
      'INSERT INTO site_types (name, name_i18n) VALUES ($1, $2) RETURNING *',
      [name.trim(), name_i18n || {}]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: '编码名称已存在' });
    console.error('Create site type error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateSiteType = async (req, res) => {
  try {
    const { typeId } = req.params;
    const { name, name_i18n } = req.body;
    const result = await db.query(
      'UPDATE site_types SET name_i18n = COALESCE($1, name_i18n), updated_at = now() WHERE id = $2 RETURNING *',
      [name_i18n || null, typeId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: '站点类型不存在' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update site type error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteSiteType = async (req, res) => {
  try {
    const { typeId } = req.params;
    const result = await db.query('DELETE FROM site_types WHERE id = $1 RETURNING *', [typeId]);
    if (result.rows.length === 0) return res.status(404).json({ error: '站点类型不存在' });
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('Delete site type error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getDashboardStats,
  getAllUsers,
  updateUserStatus,
  getAllTrades,
  getSystemConfigs,
  updateSystemConfig,
  // 资产管理
  getAllAssets,
  createAsset,
  updateAsset,
  updateAssetStatus,
  deleteAsset,
  // 代理/加盟商审批
  getAgentApplications,
  reviewAgentApplication,
  getFranchiseeApplications,
  reviewFranchiseeApplication,
  // 站点类型
  getSiteTypes,
  createSiteType,
  updateSiteType,
  deleteSiteType,
};
