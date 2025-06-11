const express = require('express');
const router = express.Router();
const balanceController = require('../controllers/balanceController');
const { ensureAuthenticated } = require('../middleware/authMiddleware');
const { depositValidation, handleValidationErrors } = require('../middleware/validationMiddleware');

router.get('/dashboard/deposit', ensureAuthenticated, balanceController.getDepositFormPage);
router.get('/dashboard/deposit/status', ensureAuthenticated, balanceController.getDepositStatusPage);

router.post('/api/balance/deposit',
    ensureAuthenticated,
    depositValidation,
    handleValidationErrors,
    balanceController.processDepositRequest
);

router.post('/api/balance/midtrans-notification', balanceController.handleMidtransNotification);
router.post('/api/balance/qris/check-status', ensureAuthenticated, balanceController.checkQrisDepositStatus);

module.exports = router;