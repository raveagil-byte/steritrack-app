const express = require('express');
const router = express.Router();
const transactionsController = require('../controllers/transactionsController');

router.get('/', transactionsController.getAllTransactions);
router.post('/', transactionsController.createTransaction);
router.post('/validate-set', transactionsController.validateSetAvailability);

// LEGACY: Simple validation (backward compatibility)
router.put('/:id/validate', transactionsController.validateTransaction);

// NEW: Enhanced validation with physical verification
router.post('/:transactionId/validate-with-verification', transactionsController.validateTransactionWithVerification);

module.exports = router;
