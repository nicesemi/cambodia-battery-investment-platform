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

module.exports = {
  getDashboardStats,
  getAllUsers,
  updateUserStatus,
  getAllTrades,
  getSystemConfigs,
  updateSystemConfig,
};
