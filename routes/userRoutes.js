const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const { isAuthenticated, forwardAuthenticated, isSeller } = require('../middleware/auth');
const balanceController = require('../controllers/balanceController');
const sellerController = require('../controllers/sellerController');


router.get('/register', forwardAuthenticated, (req, res) => {
    res.render('auth/register', { 
        titlePage: 'Register Akun', 
        name: req.flash('name')[0] || '',
        email: req.flash('email')[0] || '',
        role: req.flash('role')[0] || ''
    });
});
router.get('/login', forwardAuthenticated, (req, res) => {
    res.render('auth/login', { 
        titlePage: 'Login', 
        email: req.flash('email')[0] || '' 
    });
});
router.get('/logout', isAuthenticated, authController.logoutUser);


router.get('/dashboard', isAuthenticated, userController.getDashboard);
router.get('/dashboard/my-sc', isAuthenticated, isSeller, userController.getMySourceCodesPage);
router.get('/dashboard/profile', isAuthenticated, userController.getProfilePage);
router.post('/api/user/profile/update', isAuthenticated, userController.updateProfileInfo);
router.post('/api/user/profile/change-password', isAuthenticated, userController.changePassword);
router.post('/api/user/profile/qris-settings', isAuthenticated, isSeller, userController.updateQrisSettings);

router.get('/dashboard/orders', isAuthenticated, userController.getOrdersPage);
router.get('/dashboard/transactions', isAuthenticated, userController.getTransactionsPage);

router.get('/dashboard/deposit', isAuthenticated, balanceController.getDepositForm);
router.get('/dashboard/deposit/status', isAuthenticated, balanceController.getDepositStatus);


router.get('/dashboard/analytics', isAuthenticated, isSeller, sellerController.getSellerAnalyticsPage);
router.get('/api/seller/analytics-data', isAuthenticated, isSeller, sellerController.getSellerAnalyticsData);
router.get('/dashboard/my-sc', isAuthenticated, isSeller, userController.getMySourceCodesPage);

module.exports = router;