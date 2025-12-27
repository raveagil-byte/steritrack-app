const express = require('express');
const router = express.Router();
const assetsController = require('../controllers/assetsController');

router.get('/instrument/:instrumentId', assetsController.getAssetsByInstrument);
router.post('/batch', assetsController.batchGenerate);
router.post('/', assetsController.createAsset);
router.put('/:id', assetsController.updateAsset);
router.get('/:id', assetsController.getAssetById);

module.exports = router;
