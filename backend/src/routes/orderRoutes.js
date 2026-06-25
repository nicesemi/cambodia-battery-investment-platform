const express = require('express');
const { authenticateToken } = require('../middlewares/auth');
const orderController = require('../controllers/orderController');

const router = express.Router();

router.post('/orders', authenticateToken, orderController.createOrder);
router.get('/orders', authenticateToken, orderController.getMyOrders);
router.get('/binding', authenticateToken, orderController.getMyBinding);

module.exports = router;
