const express = require('express');
const router = express.Router();
const unitsController = require('../controllers/unitsController');

const verifyToken = require('../middleware/authMiddleware');

router.get('/', unitsController.getAllUnits); // Public access for Registration

// Protected Routes
router.post('/', verifyToken, unitsController.createUnit);
router.put('/:id', verifyToken, unitsController.updateUnit);
router.put('/:id/status', verifyToken, unitsController.updateStatus);
router.delete('/:id', verifyToken, unitsController.deleteUnit);

module.exports = router;
