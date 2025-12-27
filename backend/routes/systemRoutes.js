const express = require('express');
const router = express.Router();
const systemController = require('../controllers/systemController');

router.get('/init-db', systemController.initDb); // keeping as get for ease of browser access
router.post('/api/reset', systemController.resetSystem);
router.post('/api/reset-activity-data', systemController.resetActivityData);
router.get('/api/ping', systemController.ping);

module.exports = router;
