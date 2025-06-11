const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const sellerController = require('../controllers/sellerController');
const { ensureAuthenticated, ensureSellerOrAdmin } = require('../middleware/authMiddleware');
const {
    profileUpdateValidation,
    passwordChangeValidation,
    qrisSettingsValidation,
    apiSettingsValidation,
    handleValidationErrors
} = require('../middleware/validationMiddleware');
const upload = require('../middleware/uploadMiddleware');
const mongoose = require('mongoose');

router.get('/dashboard', ensureAuthenticated, userController.getDashboard);
router.get('/dashboard/profile', ensureAuthenticated, userController.getProfilePage);
router.get('/dashboard/orders', ensureAuthenticated, userController.getOrdersPage);
router.get('/dashboard/transactions', ensureAuthenticated, userController.getTransactionsPage);
router.get('/dashboard/my-sc', ensureAuthenticated, ensureSellerOrAdmin, userController.getMySourceCodesPage);
router.get('/dashboard/analytics', ensureAuthenticated, ensureSellerOrAdmin, sellerController.getAnalyticsPage);

router.get('/seller/:sellerId', userController.getSellerStorePage);

router.post('/api/user/profile/update',
    ensureAuthenticated,
    upload.uploadProfilePic.single('profilePictureFile'),
    profileUpdateValidation,
    handleValidationErrors,
    userController.updateUserProfile
);

router.post('/api/user/profile/change-password',
    ensureAuthenticated,
    passwordChangeValidation,
    handleValidationErrors,
    userController.changePassword
);

router.post('/api/user/profile/qris-settings',
    ensureAuthenticated,
    ensureSellerOrAdmin,
    qrisSettingsValidation,
    handleValidationErrors,
    userController.updateQrisSettings
);

router.post('/api/user/profile/api-settings',
    ensureAuthenticated,
    ensureSellerOrAdmin,
    apiSettingsValidation,
    handleValidationErrors,
    userController.updateApiSettings
);

router.post('/api/user/profile/regenerate-apikey',
    ensureAuthenticated,
    userController.regenerateApiKey
);

module.exports = router;
