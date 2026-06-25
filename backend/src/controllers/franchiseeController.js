const Joi = require('joi');
const db = require('../config/database');
const bcrypt = require('bcryptjs');

// --- 门店 ---

// 获取我的门店
const getMyStores = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT fs.*, sp.total_sales, sp.total_commission, sp.total_rental_income,
              sp.order_count, sp.investor_count
       FROM franchisee_stores fs
       LEFT JOIN store_performance sp ON sp.store_id = fs.id
       WHERE fs.owner_id = $1
       ORDER BY fs.created_at DESC`,
      [req.user.id]
    );
    res.json({ stores: result.rows });
  } catch (error) {
    console.error('Get my stores error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 获取门店详情
const getStoreDetail = async (req, res) => {
  try {
    const { storeId } = req.params;
    const storeResult = await db.query(
      `SELECT fs.*, sp.total_sales, sp.total_commission, sp.total_rental_income,
              sp.order_count, sp.investor_count
       FROM franchisee_stores fs
       LEFT JOIN store_performance sp ON sp.store_id = fs.id
       WHERE fs.id = $1 AND fs.owner_id = $2`,
      [storeId, req.user.id]
    );
    if (storeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Store not found' });
    }
    // 获取绑定的投资者列表
    const investorsResult = await db.query(
      `SELECT u.id, u.username, u.email, u.phone, u.full_name, ib.bound_at
       FROM investor_store_bindings ib
       JOIN users u ON u.id = ib.investor_id
       WHERE ib.store_id = $1
       ORDER BY ib.bound_at DESC`,
      [storeId]
    );
    res.json({
      store: storeResult.rows[0],
      investors: investorsResult.rows,
    });
  } catch (error) {
    console.error('Get store detail error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 新增门店
const addStoreSchema = Joi.object({
  name: Joi.string().required(),
  city: Joi.string().required(),
  address: Joi.string().allow(''),
  phone: Joi.string().allow(''),
});

const addStore = async (req, res) => {
  try {
    // 检查加盟商是否有审批通过的门店申请 或 代理申请
    const [franchiseeCheck, agentCheck] = await Promise.all([
      db.query(`SELECT id FROM franchisee_applications WHERE user_id = $1 AND status = 'approved' LIMIT 1`, [req.user.id]),
      db.query(`SELECT id FROM agent_applications WHERE user_id = $1 AND status = 'approved' LIMIT 1`, [req.user.id]),
    ]);
    if (franchiseeCheck.rows.length === 0 && agentCheck.rows.length === 0) {
      return res.status(403).json({ error: '您尚未通过加盟商/代理商审批，无法新增门店' });
    }

    const { error, value } = addStoreSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { name, city, address, phone } = value;
    const result = await db.query(
      `INSERT INTO franchisee_stores (owner_id, name, city, address, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.user.id, name, city, address || null, phone || null]
    );
    // 初始化业绩记录
    await db.query(
      'INSERT INTO store_performance (store_id) VALUES ($1) ON CONFLICT (store_id) DO NOTHING',
      [result.rows[0].id]
    );

    res.status(201).json({ message: '门店创建成功', store: result.rows[0] });
  } catch (error) {
    console.error('Add store error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// --- 申请 ---

const submitApplicationSchema = Joi.object({
  store_name: Joi.string().required(),
  city: Joi.string().required(),
  address: Joi.string().allow(''),
  phone: Joi.string().required(),
  reason: Joi.string().allow(''),
  parent_agent_id: Joi.string().uuid().allow(null, ''),
  agent_type: Joi.string().valid('province_agent', 'city_franchisee', 'independent').allow(null, ''),
});

const submitApplication = async (req, res) => {
  try {
    const { error, value } = submitApplicationSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { store_name, city, address, phone, reason, parent_agent_id, agent_type } = value;
    const result = await db.query(
      `INSERT INTO franchisee_applications (user_id, store_name, city, address, phone, reason, parent_agent_id, agent_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [req.user.id, store_name, city, address || null, phone, reason || null,
       parent_agent_id || null, agent_type || 'independent']
    );
    res.status(201).json({ message: '申请已提交', application: result.rows[0] });
  } catch (error) {
    console.error('Submit application error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getMyApplications = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM franchisee_applications
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ applications: result.rows });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// --- 店员帮投资者注册 ---

const staffRegisterInvestorSchema = Joi.object({
  email: Joi.string().email().required(),
  username: Joi.string().min(3).max(50).required(),
  password: Joi.string().min(6).required(),
  fullName: Joi.string().allow(''),
  phone: Joi.string().allow(''),
  storeId: Joi.string().uuid().required(),
});

const staffRegisterInvestor = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const { error, value } = staffRegisterInvestorSchema.validate(req.body);
    if (error) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, username, password, fullName, phone, storeId } = value;

    // 验证门店属于该加盟商
    const storeCheck = await client.query(
      'SELECT id, store_code FROM franchisee_stores WHERE id = $1 AND owner_id = $2',
      [storeId, req.user.id]
    );
    if (storeCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: '门店不存在或不属于您' });
    }

    // 检查邮箱/用户名是否已存在
    const dupCheck = await client.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );
    if (dupCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: '邮箱或用户名已存在' });
    }

    // 创建投资者账户
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const userResult = await client.query(
      `INSERT INTO users (email, username, password_hash, full_name, phone, role)
       VALUES ($1, $2, $3, $4, $5, 'investor')
       RETURNING id, email, username, full_name, role, created_at`,
      [email, username, passwordHash, fullName || null, phone || null]
    );

    const investor = userResult.rows[0];

    // 创建钱包
    await client.query('INSERT INTO user_wallets (user_id) VALUES ($1)', [investor.id]);

    // 绑定投资者到门店
    await client.query(
      `INSERT INTO investor_store_bindings (investor_id, store_id, bound_by)
       VALUES ($1, $2, $3)`,
      [investor.id, storeId, req.user.id]
    );

    // 更新门店投资者计数
    await client.query(
      `UPDATE store_performance SET investor_count = investor_count + 1, updated_at = now()
       WHERE store_id = $1`,
      [storeId]
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: '投资者注册成功并已绑定门店',
      investor: {
        id: investor.id,
        email: investor.email,
        username: investor.username,
        fullName: investor.full_name,
      },
      store: storeCheck.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Staff register investor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

// --- 门店业绩 ---

const getStorePerformance = async (req, res) => {
  try {
    const { storeId } = req.params;
    const storeCheck = await db.query(
      'SELECT id FROM franchisee_stores WHERE id = $1 AND owner_id = $2',
      [storeId, req.user.id]
    );
    if (storeCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Store not found' });
    }

    const result = await db.query(
      'SELECT * FROM store_performance WHERE store_id = $1',
      [storeId]
    );
    // 获取近期订单明细
    const ordersResult = await db.query(
      `SELECT io.*, ba.name as asset_name
       FROM investor_orders io
       LEFT JOIN battery_assets ba ON io.asset_id = ba.id
       WHERE io.store_id = $1
       ORDER BY io.created_at DESC
       LIMIT 50`,
      [storeId]
    );

    res.json({
      performance: result.rows[0] || null,
      recentOrders: ordersResult.rows,
    });
  } catch (error) {
    console.error('Get store performance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// --- 获取可选的上级代理列表 ---
const getAgentOptions = async (req, res) => {
  try {
    // 查询已审批通过的省级/市级代理（role为 franchisee 且 agent_applications 中 approved）
    const result = await db.query(
      `SELECT u.id, u.username, u.full_name, aa.agent_type, aa.region
       FROM users u
       JOIN agent_applications aa ON aa.user_id = u.id
       WHERE aa.status = 'approved'
       ORDER BY aa.agent_type, aa.region`
    );
    res.json({ agents: result.rows });
  } catch (error) {
    console.error('Get agent options error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getMyStores,
  getStoreDetail,
  addStore,
  submitApplication,
  getMyApplications,
  staffRegisterInvestor,
  getStorePerformance,
  getAgentOptions,
};
