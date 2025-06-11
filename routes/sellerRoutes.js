// routes/sellerRoutes.js
const express = require('express');
const router = express.Router();
const sellerController = require('../controllers/sellerController');
const { ensureAuthenticated, ensureSellerOrAdmin } = require('../middleware/authMiddleware');

router.get('/api/seller/analytics-data', ensureAuthenticated, ensureSellerOrAdmin, sellerController.getSellerAnalyticsData);

module.exports = router;