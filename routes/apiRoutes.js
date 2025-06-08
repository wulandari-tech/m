const { Router } = require('express');
const midtransNotificationController = require('../controllers/midtransNotificationController');
const balanceController = require('../controllers/balanceController');
const { requireAuth } = require('../middleware/authMiddleware'); 
const router = Router();
router.post('/midtrans/notification', midtransNotificationController.handle_notification);
router.post('/balance/deposit', requireAuth, balanceController.create_deposit_transaction);


module.exports = router;