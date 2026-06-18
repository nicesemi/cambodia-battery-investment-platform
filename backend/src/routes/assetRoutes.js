const express = require('express');
const { authenticateToken } = require('../middlewares/auth');
const assetController = require('../controllers/assetController');

const router = express.Router();

router.get('/', authenticateToken, assetController.getAssets);
router.get('/my', authenticateToken, assetController.getUserAssets);
router.post('/purchase', authenticateToken, assetController.purchaseAsset);

module.exports = router;
