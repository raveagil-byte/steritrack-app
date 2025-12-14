const express = require('express');
const router = express.Router();
const auditLogsController = require('../controllers/auditLogsController');

router.get('/', auditLogsController.getAuditLogs);
router.get('/stats', auditLogsController.getAuditStats);
router.get('/:id', auditLogsController.getAuditLogById);

module.exports = router;
