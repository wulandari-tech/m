const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { profilePictureStorageCloudinary } = require('../config/cloudinaryConfig');

const ensureDirectoryExistence = (filePath) => {
    const dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) { return true; }
    ensureDirectoryExistence(dirname);
    fs.mkdirSync(dirname, { recursive: true });
};

const scFileStorageLocal = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '..', 'public', 'uploads', 'sc_files');
        ensureDirectoryExistence(path.join(uploadPath, 'placeholder.txt'));
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-SC-${file.originalname.replace(/\s+/g, '-')}`);
    }
});

const imageFileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) { cb(null, true); }
    else { cb(new Error('Hanya file gambar yang diizinkan!'), false); }
};

const scFileFilter = (req, file, cb) => {
    const allowedMimes = ['application/zip', 'application/x-zip-compressed', 'application/x-rar-compressed', 'application/vnd.rar', 'application/x-7z-compressed', 'text/plain', 'application/octet-stream'];
    const allowedExts = ['.zip', '.rar', '.7z', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) { cb(null, true); }
    else { cb(new Error('Tipe file source code tidak diizinkan!'), false); }
};

const tempScreenshotStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const tempPath = path.join(__dirname, '..', 'public', 'uploads', 'temp_screenshots');
        ensureDirectoryExistence(path.join(tempPath, 'placeholder.txt'));
        cb(null, tempPath);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-TEMPSS-${file.originalname.replace(/\s+/g, '-')}`);
    }
});

const uploadProfilePicToCloudinary = multer({
    storage: profilePictureStorageCloudinary,
    fileFilter: imageFileFilter,
    limits: { fileSize: 2 * 1024 * 1024 }
});

const productFieldsUploader = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            let destFolder = path.join(__dirname, '..', 'public', 'uploads', 'temp_generic');
            if (file.fieldname === 'sc_file') {
                destFolder = path.join(__dirname, '..', 'public', 'uploads', 'sc_files');
            } else if (file.fieldname === 'screenshots') {
                destFolder = path.join(__dirname, '..', 'public', 'uploads', 'temp_screenshots');
            }
            ensureDirectoryExistence(path.join(destFolder, 'placeholder.txt'));
            cb(null, destFolder);
        },
        filename: function (req, file, cb) {
            const prefix = file.fieldname === 'sc_file' ? 'SC' : 'TEMPSS';
            cb(null, `${Date.now()}-${prefix}-${file.originalname.replace(/\s+/g, '-')}`);
        }
    }),
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'sc_file') {
            return scFileFilter(req, file, cb);
        } else if (file.fieldname === 'screenshots') {
            return imageFileFilter(req, file, cb);
        }
        cb(new Error('Field file tidak dikenal'), false);
    },
    limits: { fileSize: 50 * 1024 * 1024 }
});

module.exports = {
    uploadProfilePic: uploadProfilePicToCloudinary,
    productFieldsParser: productFieldsUploader
};