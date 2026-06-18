const express = require('express');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');
const dividendController = require('../controllers/dividendController');

const router = express.Router();

router.get('/my', authenticateToken, dividendController.getMyDividends);
router.get('/forecast', authenticateToken, dividendController.getMarketForecast);
router.post('/calculate', authenticateToken, requireAdmin, dividendController.triggerDividendCalculation);

module.exports = router;
