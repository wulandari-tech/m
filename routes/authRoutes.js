const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const { registerValidation, loginValidation, handleValidationErrors } = require('../middleware/validationMiddleware');
const { ensureGuest, ensureAuthenticated } = require('../middleware/authMiddleware');

router.get('/register', ensureGuest, userController.getRegisterPage);
router.post('/api/auth/register',
    ensureGuest,
    registerValidation,
    handleValidationErrors,
    authController.registerUser
);

router.get('/login', ensureGuest, userController.getLoginPage);
router.post('/api/auth/login',
    ensureGuest,
    loginValidation,
    handleValidationErrors,
    authController.loginUser
);

router.get('/logout', ensureAuthenticated, authController.logoutUser);

module.exports = router;