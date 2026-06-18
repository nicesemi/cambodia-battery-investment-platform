const express = require('express');
const { authenticateToken } = require('../middlewares/auth');
const tradeController = require('../controllers/tradeController');

const router = express.Router();

router.post('/orders', authenticateToken, tradeController.createOrder);
router.get('/orders', authenticateToken, tradeController.getMyOrders);
router.get('/orderbook/:assetId', authenticateToken, tradeController.getOrderBook);
router.delete('/orders/:orderId', authenticateToken, tradeController.cancelOrder);

module.exports = router;
