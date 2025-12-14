const express = require('express');
const router = express.Router();
const packsController = require('../controllers/packsController');

router.get('/', packsController.getAllPacks);
router.get('/:id', packsController.getPack);
router.post('/', packsController.createPack);
router.post('/:id/sterilize', packsController.sterilizePack);

module.exports = router;
