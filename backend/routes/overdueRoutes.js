const express = require('express');
const router = express.Router();
const overdueController = require('../controllers/overdueController');

router.get('/', overdueController.getOverdueInstruments);
router.get('/check/:unitId', overdueController.checkUnitOverdue);

module.exports = router;
