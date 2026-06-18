const express = require('express');
const { authenticateToken } = require('../middlewares/auth');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/profile', authenticateToken, authController.getProfile);

module.exports = router;
