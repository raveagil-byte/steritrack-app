const express = require('express');
const router = express.Router();
const instrumentsController = require('../controllers/instrumentsController');

router.get('/', instrumentsController.getAllInstruments);
router.post('/', instrumentsController.createInstrument);
router.put('/:id', instrumentsController.updateInstrument);
router.put('/:id/status', instrumentsController.updateStatus);
router.put('/update-stock', instrumentsController.updateStock);
router.delete('/:id', instrumentsController.deleteInstrument);

module.exports = router;
