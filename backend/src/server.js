require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cron = require('node-cron');
const { calculateAndDistributeDividends } = require('./controllers/dividendController');

// 路由导入
const authRoutes = require('./routes/authRoutes');
const assetRoutes = require('./routes/assetRoutes');
const tradeRoutes = require('./routes/tradeRoutes');
const dividendRoutes = require('./routes/dividendRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 请求日志
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/dividends', dividendRoutes);
app.use('/api/admin', adminRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// 定时任务：每月1日凌晨2点自动计算上月分红
cron.schedule('0 2 1 * *', async () => {
  try {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const period = lastMonth.toISOString().slice(0, 7);
    
    console.log(`Starting automatic dividend calculation for ${period}`);
    await calculateAndDistributeDividends(period);
    console.log('Automatic dividend calculation completed');
  } catch (error) {
    console.error('Automatic dividend calculation failed:', error);
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   柬埔寨换电虚拟资产投资平台 - 后端API服务                 ║
║   Battery Investment Platform - Backend API              ║
║                                                          ║
║   Server running on http://localhost:${PORT}               ║
║   Environment: ${process.env.NODE_ENV || 'development'}            ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
