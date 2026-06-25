const express = require('express');
const { authenticateToken } = require('../middlewares/auth');
const franchiseeController = require('../controllers/franchiseeController');

const router = express.Router();

// 门店
router.get('/stores', authenticateToken, franchiseeController.getMyStores);
router.post('/stores', authenticateToken, franchiseeController.addStore);
router.get('/stores/:storeId', authenticateToken, franchiseeController.getStoreDetail);
router.get('/stores/:storeId/performance', authenticateToken, franchiseeController.getStorePerformance);

// 申请
router.post('/applications', authenticateToken, franchiseeController.submitApplication);
router.get('/applications', authenticateToken, franchiseeController.getMyApplications);

// 店员帮投资者注册
router.post('/staff-register-investor', authenticateToken, franchiseeController.staffRegisterInvestor);

// 获取可选上级代理
router.get('/agent-options', authenticateToken, franchiseeController.getAgentOptions);

module.exports = router;
