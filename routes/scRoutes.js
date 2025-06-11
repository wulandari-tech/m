const express = require('express');
const router = express.Router();
const scController = require('../controllers/scController');
const { ensureAuthenticated, ensureSellerOrAdmin } = require('../middleware/authMiddleware');
const { addScValidation, reviewValidation, handleValidationErrors } = require('../middleware/validationMiddleware');
const upload = require('../middleware/uploadMiddleware');
const path = require('path'); 
const productUploadHandler = upload.productFieldsParser.fields([
    { name: 'sc_file', maxCount: 1 },
    { name: 'screenshots', maxCount: 5 }
]);

const handleProductUploadError = (err, req, res, next) => {
    if (err) {
        console.error("Multer error during product upload:", err);
        if (err.code === 'LIMIT_FILE_SIZE') {
            req.flash('error_msg', `File terlalu besar. Maksimum ${err.field === 'sc_file' ? '50MB' : '5MB'}.`);
        } else if (err instanceof multer.MulterError) {
             req.flash('error_msg', `Error upload Multer: ${err.message}`);
        } else {
            req.flash('error_msg', `Error upload file: ${err.message}`);
        }
        req.flash('formInput', req.body);
        const redirectPath = req.path.includes('/edit/') ? `/sc/edit/${req.params.id}` : '/sc/add';
        return res.redirect(redirectPath);
    }
    next();
};

router.get('/sc-list', scController.getScListPage);
router.get('/sc/add', ensureAuthenticated, ensureSellerOrAdmin, scController.getAddScPage);
router.get('/sc/:id', scController.getScDetailPage);
router.get('/sc/edit/:id', ensureAuthenticated, ensureSellerOrAdmin, scController.getEditScPage);


router.post('/api/sc',
    ensureAuthenticated,
    ensureSellerOrAdmin,
    (req, res, next) => { productUploadHandler(req, res, (err) => handleProductUploadError(err, req, res, next)); },
    addScValidation,
    handleValidationErrors,
    scController.createSc
);

router.put('/api/sc/:id',
    ensureAuthenticated,
    ensureSellerOrAdmin,
    (req, res, next) => { productUploadHandler(req, res, (err) => handleProductUploadError(err, req, res, next)); },
    addScValidation,
    handleValidationErrors,
    scController.updateSc
);

router.post('/api/sc/:id/toggle-visibility',
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