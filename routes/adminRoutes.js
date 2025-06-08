const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

router.use(isAuthenticated, isAdmin); 
router.get('/users', adminController.getUsersPage);
router.get('/sc-management', adminController.getScManagementPage);
router.post('/sc-approve/:id', adminController.approveSc);
router.post('/sc-reject/:id', adminController.rejectSc);

module.exports = router;