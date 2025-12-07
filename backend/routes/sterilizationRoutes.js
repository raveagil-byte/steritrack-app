const express = require('express');
const router = express.Router();
const sterilizationController = require('../controllers/sterilizationController');

router.post('/wash', sterilizationController.washItems);
router.post('/sterilize', sterilizationController.sterilizeItems);

module.exports = router;
