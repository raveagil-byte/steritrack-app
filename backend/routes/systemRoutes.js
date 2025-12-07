const express = require('express');
const router = express.Router();
const systemController = require('../controllers/systemController');

router.get('/init-db', systemController.initDb); // keeping as get for ease of browser access
router.post('/api/reset', systemController.resetSystem);

module.exports = router;
