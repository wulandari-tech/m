const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const { isAuthenticated, forwardAuthenticated, isSeller } = require('../middleware/auth');
const balanceController = require('../controllers/balanceController');
const sellerController = require('../controllers/sellerController');
const multer = require('multer');
const path = require('path');

const profilePicStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/images/avatars/'); // Simpan avatar di public agar bisa diakses langsung
    },
    filename: function (req, file, cb) {
        cb(null, 'avatar-' + req.user._id + '-' + Date.now() + path.extname(file.originalname));
    }
});
const profilePicFileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Hanya file gambar yang diizinkan!'), false);
    }
};
const uploadProfilePic = multer({
    storage: profilePicStorage,
    limits: { fileSize: 2 * 1024 * 1024 }, // Maks 2MB
    fileFilter: profilePicFileFilter
});


router.get('/register', forwardAuthenticated, userController.getRegisterPage); // Pindahkan render ke controller
router.get('/login', forwardAuthenticated, userController.getLoginPage); // Pindahkan render ke controller
router.get('/logout', isAuthenticated, authController.logoutUser);


router.get('/dashboard', isAuthenticated, userController.getDashboard);
router.get('/dashboard/profile', isAuthenticated, userController.getProfilePage);
router.post('/api/user/profile/update', isAuthenticated, uploadProfilePic.single('profilePictureFile'), userController.updateProfileInfo);
router.post('/api/user/profile/change-password', isAuthenticated, userController.changePassword);
router.post('/api/user/profile/qris-settings', isAuthenticated, isSeller, userController.updateQrisSettings);

router.get('/dashboard/orders', isAuthenticated, userController.getOrdersPage);
router.get('/dashboard/transactions', isAuthenticated, userController.getTransactionsPage);

router.get('/dashboard/deposit', isAuthenticated, balanceController.getDepositForm);
router.get('/dashboard/deposit/status', isAuthenticated, balanceController.getDepositStatus);

router.get('/dashboard/analytics', isAuthenticated, isSeller, sellerController.getSellerAnalyticsPage);
router.get('/api/seller/analytics-data', isAuthenticated, isSeller, sellerController.getSellerAnalyticsData);

router.get('/dashboard/my-sc', isAuthenticated, isSeller, userController.getMySourceCodesPage);


router.get('/seller/:sellerId', userController.getSellerStorePage); 
module.exports = router;