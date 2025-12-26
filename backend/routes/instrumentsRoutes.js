const express = require('express');
const router = express.Router();
const instrumentsController = require('../controllers/instrumentsController');

router.get('/', instrumentsController.getAllInstruments);
router.get('/unassigned', instrumentsController.getUnassignedInstruments);
router.post('/', instrumentsController.createInstrument);
router.put('/:id', instrumentsController.updateInstrument);
router.put('/:id/status', instrumentsController.updateStatus);
router.put('/update-stock', instrumentsController.updateStock);
router.delete('/:id', instrumentsController.deleteInstrument);
router.put('/:id/max-stock', instrumentsController.updateMaxStock); // New endpoint

module.exports = router;
