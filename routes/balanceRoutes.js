const express = require('express');
const router = express.Router();
const balanceController = require('../controllers/balanceController');
const { isAuthenticated } = require('../middleware/auth');
router.post('/deposit', isAuthenticated, balanceController.processDepositRequest);
router.post('/midtrans-notification', balanceController.handleMidtransNotification); 
router.post('/deposit/qris/check-status', isAuthenticated, balanceController.checkQrisDepositStatus); 
module.exports = router;