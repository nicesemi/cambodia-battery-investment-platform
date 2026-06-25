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

// 资产管理
router.get('/assets', authenticateToken, requireAdmin, adminController.getAllAssets);
router.post('/assets', authenticateToken, requireAdmin, adminController.createAsset);
router.put('/assets/:assetId', authenticateToken, requireAdmin, adminController.updateAsset);
router.patch('/assets/:assetId/status', authenticateToken, requireAdmin, adminController.updateAssetStatus);
router.delete('/assets/:assetId', authenticateToken, requireAdmin, adminController.deleteAsset);

// 代理/加盟商审批
router.get('/agent-applications', authenticateToken, requireAdmin, adminController.getAgentApplications);
router.put('/agent-applications/:applicationId/review', authenticateToken, requireAdmin, adminController.reviewAgentApplication);
router.get('/franchisee-applications', authenticateToken, requireAdmin, adminController.getFranchiseeApplications);
router.put('/franchisee-applications/:applicationId/review', authenticateToken, requireAdmin, adminController.reviewFranchiseeApplication);

module.exports = router;
