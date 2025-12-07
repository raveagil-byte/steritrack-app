const express = require('express');
const router = express.Router();
const transactionsController = require('../controllers/transactionsController');

router.get('/', transactionsController.getAllTransactions);
router.post('/', transactionsController.createTransaction);
router.post('/validate-set', transactionsController.validateSetAvailability);
router.put('/:id/validate', transactionsController.validateTransaction);

module.exports = router;
