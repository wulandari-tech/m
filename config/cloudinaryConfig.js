const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true // Selalu gunakan https
});

const screenshotStorageCloudinary = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'marketplace_screenshots', // Nama folder di Cloudinary
        format: async (req, file) => { // Format bisa png, jpg, webp dll.
            const ext = file.mimetype.split('/')[1];
            if (['jpeg', 'jpg', 'png', 'gif', 'webp'].includes(ext)) return ext;
            return 'jpg'; // default ke jpg jika format tidak didukung
        },
        public_id: (req, file) => `screenshot-${Date.now()}-${Math.round(Math.random() * 1E5)}-${file.originalname.split('.')[0].replace(/\s+/g, '-')}`,
        transformation: [{ width: 1000, height: 750, crop: "limit" }] // Contoh transformasi opsional
    },
});

const profilePictureStorageCloudinary = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'marketplace_profiles',
        format: async (req, file) => {
            const ext = file.mimetype.split('/')[1];
            if (['jpeg', 'jpg', 'png', 'webp'].includes(ext)) return ext;
            return 'jpg';
        },
        public_id: (req, file) => `profile-${req.user ? req.user.id : 'guest'}-${Date.now()}`,
        transformation: [{ width: 300, height: 300, crop: "fill", gravity: "face" }]
    },
});


module.exports = {
    cloudinary,
    screenshotStorageCloudinary,
    profilePictureStorageCloudinary
};