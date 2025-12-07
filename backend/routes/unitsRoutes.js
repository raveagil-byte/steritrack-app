const express = require('express');
const router = express.Router();
const unitsController = require('../controllers/unitsController');

router.get('/', unitsController.getAllUnits);
router.post('/', unitsController.createUnit);
router.put('/:id', unitsController.updateUnit);
router.put('/:id/status', unitsController.updateStatus);
router.delete('/:id', unitsController.deleteUnit);

module.exports = router;
