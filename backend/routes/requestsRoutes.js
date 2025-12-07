const express = require('express');
const router = express.Router();
const requestsController = require('../controllers/requestsController');

router.get('/', requestsController.getAllRequests);
router.post('/', requestsController.createRequest);
router.put('/:id/status', requestsController.updateStatus);

module.exports = router;
