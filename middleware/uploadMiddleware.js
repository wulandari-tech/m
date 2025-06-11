const multer = require('multer');
const path = require('path');
const fs = require('fs');

const ensureDirectoryExistence = (filePath) => {
    const dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) { return true; }
    ensureDirectoryExistence(dirname);
    fs.mkdirSync(dirname, { recursive: true });
};

const storageConfig = (folder) => multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '..', 'public', 'uploads', folder);
        ensureDirectoryExistence(path.join(uploadPath, 'placeholder.txt'));
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const prefix = folder === 'sc_files' ? 'SC' : (folder === 'screenshots' ? 'SS' : 'PROF');
        cb(null, `${Date.now()}-${prefix}-${file.originalname.replace(/\s+/g, '-')}`);
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

const multiFieldUploader = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            let folder = 'temp_uploads';
            if (file.fieldname === 'sc_file') folder = 'sc_files';
            else if (file.fieldname === 'screenshots') folder = 'screenshots';
            else if (file.fieldname === 'profilePictureFile') folder = 'profiles';
            
            const uploadPath = path.join(__dirname, '..', 'public', 'uploads', folder);
            ensureDirectoryExistence(path.join(uploadPath, 'placeholder.txt'));
            cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
            const prefix = file.fieldname === 'sc_file' ? 'SC' : (file.fieldname === 'screenshots' ? 'SS' : (file.fieldname === 'profilePictureFile' ? 'PROF' : 'FILE'));
            cb(null, `${Date.now()}-${prefix}-${file.originalname.replace(/\s+/g, '-')}`);
        }
    }),
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'sc_file') return scFileFilter(req, file, cb);
        if (file.fieldname === 'screenshots' || file.fieldname === 'profilePictureFile') return imageFileFilter(req, file, cb);
        cb(null, false);
    },
    limits: { fileSize: 50 * 1024 * 1024 }
});

module.exports = {
    uploadProfilePic: multer({ storage: storageConfig('profiles'), fileFilter: imageFileFilter, limits: { fileSize: 2 * 1024 * 1024 } }),
    fieldsUploader: multiFieldUploader
};