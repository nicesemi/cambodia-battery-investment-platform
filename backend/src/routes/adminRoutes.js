const express = require('express');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');
const adminController = require('../controllers/adminController');

const router = express.Router();

router.get('/dashboard', authenticateToken, requireAdmin, adminController.getDashboardStats);
router.get('/users', authenticateToken, requireAdmin, adminController.getAllUsers);
router.put('/users/:userId', authenticateToken, requireAdmin, adminController.updateUserStatus);
router.get('/trades', authenticateToken, requireAdmin, adminController.getAllTrades);
router.get('/configs', authenticateToken, requireAdmin, adminController.getSystemConfigs);
router.put('/configs/:configKey', authenticateToken, requireAdmin, adminController.updateSystemConfig);

module.exports = router;
