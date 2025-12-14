const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');

router.get('/stock-consistency', auditController.checkStockConsistency);

module.exports = router;
