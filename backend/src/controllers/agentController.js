const Joi = require('joi');
const db = require('../config/database');

const submitAgentApplicationSchema = Joi.object({
  agent_type: Joi.string().valid('province_agent', 'city_franchisee').required(),
  full_name: Joi.string().required(),
  phone: Joi.string().required(),
  region: Joi.string().required(),
  city: Joi.string().allow(''),
  reason: Joi.string().allow(''),
});

// 提交代理申请
const submitAgentApplication = async (req, res) => {
  try {
    const { error, value } = submitAgentApplicationSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { agent_type, full_name, phone, region, city, reason } = value;

    const result = await db.query(
      `INSERT INTO agent_applications (user_id, agent_type, full_name, phone, region, city, reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.user.id, agent_type, full_name, phone, region, city || null, reason || null]
    );

    res.status(201).json({
      message: '代理申请已提交，等待审核',
      application: result.rows[0],
    });
  } catch (error) {
    console.error('Submit agent application error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 获取我的代理申请
const getMyAgentApplications = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM agent_applications
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ applications: result.rows });
  } catch (error) {
    console.error('Get agent applications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 检查用户是否是已审批代理
const checkAgentStatus = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM agent_applications
       WHERE user_id = $1 AND status = 'approved'
       ORDER BY created_at DESC
       LIMIT 1`,
      [req.user.id]
    );
    res.json({
      is_approved_agent: result.rows.length > 0,
      agent_info: result.rows[0] || null,
    });
  } catch (error) {
    console.error('Check agent status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  submitAgentApplication,
  getMyAgentApplications,
  checkAgentStatus,
};
