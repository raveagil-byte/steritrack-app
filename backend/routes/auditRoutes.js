const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');

router.get('/stock-consistency', auditController.checkStockConsistency);
router.post('/stock-take', auditController.submitStockOpname); // New Opname Endpoint

module.exports = router;
