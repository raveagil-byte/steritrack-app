const express = require('express');
const router = express.Router();
const setsController = require('../controllers/setsController');

router.get('/', setsController.getAllSets);
router.post('/', setsController.createSet);
router.put('/:id', setsController.updateSet);
router.put('/:id/status', setsController.updateStatus);
router.delete('/:id', setsController.deleteSet);

module.exports = router;
