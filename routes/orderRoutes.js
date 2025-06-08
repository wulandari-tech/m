const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController'); // Pastikan path ini benar
const { isAuthenticated } = require('../middleware/auth');

// POST /api/orders/
router.post('/', isAuthenticated, orderController.createOrder);
router.get('/status', isAuthenticated, orderController.getOrderStatusPage);
router.post('/qris/check-status', isAuthenticated, orderController.checkQrisOrderStatus);

module.exports = router;