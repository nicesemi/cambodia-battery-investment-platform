const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const db = require('../config/database');

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  username: Joi.string().min(3).max(50).required(),
  password: Joi.string().min(6).required(),
  fullName: Joi.string().allow(''),
  phone: Joi.string().allow(''),
  role: Joi.string().valid('user', 'investor', 'franchisee').default('investor'),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const register = async (req, res) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, username, password, fullName, phone, role } = value;

    // 检查邮箱是否已存在
    const existingEmail = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    if (existingEmail.rows.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // 检查用户名是否已存在
    const existingUsername = await db.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );
    if (existingUsername.rows.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // 加密密码
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 创建用户
    const result = await db.query(
      `INSERT INTO users (email, username, password_hash, full_name, phone, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, username, full_name, role, created_at`,
      [email, username, passwordHash, fullName || null, phone || null, role || 'investor']
    );

    const user = result.rows[0];

    // 创建钱包
    await db.query(
      'INSERT INTO user_wallets (user_id) VALUES ($1)',
      [user.id]
    );

    // 生成JWT
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const login = async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, password } = value;

    // 查找用户
    const result = await db.query(
      'SELECT id, email, username, password_hash, full_name, role, is_active FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is disabled' });
    }

    // 验证密码
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // 生成JWT
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getProfile = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, email, username, full_name, phone, country, language, 
              role, kyc_status, total_investment, total_dividends, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    const walletResult = await db.query(
      'SELECT balance, frozen_balance, currency FROM user_wallets WHERE user_id = $1',
      [req.user.id]
    );

    res.json({
      user: result.rows[0],
      wallet: walletResult.rows[0],
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  register,
  login,
  getProfile,
};
