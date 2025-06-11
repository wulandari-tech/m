const express = require('express');
const router = express.Router();
const scController = require('../controllers/scController');
const { ensureAuthenticated, ensureSellerOrAdmin } = require('../middleware/authMiddleware');
const { addScValidation, reviewValidation, handleValidationErrors } = require('../middleware/validationMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/sc-list', scController.getScListPage);
router.get('/sc/add', ensureAuthenticated, ensureSellerOrAdmin, scController.getAddScPage);
router.get('/sc/:id', scController.getScDetailPage);
router.get('/sc/edit/:id', ensureAuthenticated, ensureSellerOrAdmin, scController.getEditScPage);

const productUploadMiddleware = upload.fieldsUploader.fields([
    { name: 'sc_file', maxCount: 1 },
    { name: 'screenshots', maxCount: 5 }
]);

router.post('/api/sc',
    ensureAuthenticated,
    ensureSellerOrAdmin,
    productUploadMiddleware,
    addScValidation,
    handleValidationErrors,
    scController.createSc
);

router.put('/api/sc/:id',
    ensureAuthenticated,
    ensureSellerOrAdmin,
    productUploadMiddleware,
    addScValidation,
    handleValidationErrors,
    scController.updateSc
);

router.post('/api/sc/:id/toggle-visibility', // Menggunakan POST karena mengubah data
    ensureAuthenticated,
    ensureSellerOrAdmin,
    scController.toggleProductVisibility
);

router.delete('/api/sc/:id',
    ensureAuthenticated,
    ensureSellerOrAdmin,
    scController.deleteSc
);

router.post('/api/sc/:id/reviews',
    ensureAuthenticated,
    reviewValidation,
    handleValidationErrors,
    scController.addScReview
);

router.get('/api/sc/quick-view/:id', scController.getQuickViewSc);

module.exports = router;