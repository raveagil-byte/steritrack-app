const express = require('express');
const router = express.Router();
const usageController = require('../controllers/usageController');

// Log new usage (Link to Patient)
router.post('/', usageController.logUsage);

// Get usage history (optional, for history view)
router.get('/', usageController.getUsageHistory);

// Get details of a specific usage record
router.get('/:id', usageController.getUsageById);

module.exports = router;
