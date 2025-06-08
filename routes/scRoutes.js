const express = require('express');
const router = express.Router();
const scController = require('../controllers/scController');
const { isAuthenticated, isSeller } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (file.fieldname === "sc_file") {
            cb(null, 'uploads/sc_files/');
        } else if (file.fieldname === "screenshots") {
            cb(null, 'uploads/screenshots/');
        } else {
            cb(null, 'uploads/others/');
        }
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (file.fieldname === "sc_file") {
        if (file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed' || file.mimetype === 'text/plain' || file.mimetype === 'application/octet-stream') {
            cb(null, true);
        } else {
            cb(new Error('Hanya file .zip atau .txt yang diizinkan untuk file SC!'), false);
        }
    } else if (file.fieldname === "screenshots") {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Hanya file gambar yang diizinkan untuk screenshot!'), false);
        }
    } else {
        cb(null, false);
    }
};

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024, files: 6 }, 
    fileFilter: fileFilter
});

router.get('/add', isAuthenticated, isSeller, scController.getAddScForm);
router.post('/', isAuthenticated, isSeller, upload.fields([{ name: 'sc_file', maxCount: 1 }, { name: 'screenshots', maxCount: 5 }]), scController.createSc);
router.get('/:id', scController.getScDetail);
router.post('/:id/reviews', isAuthenticated, scController.submitReview);

module.exports = router;