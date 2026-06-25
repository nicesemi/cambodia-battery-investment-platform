const express = require('express');
const { authenticateToken } = require('../middlewares/auth');
const agentController = require('../controllers/agentController');

const router = express.Router();

router.post('/apply', authenticateToken, agentController.submitAgentApplication);
router.get('/applications', authenticateToken, agentController.getMyAgentApplications);
router.get('/status', authenticateToken, agentController.checkAgentStatus);

module.exports = router;
