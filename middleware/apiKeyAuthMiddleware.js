const User = require('../models/user');

const apiKeyAuth = async (req, res, next) => {
    const apiKey = req.header('X-API-KEY') || req.query.apiKey;

    if (!apiKey) {
        return res.status(401).json({ success: false, message: 'Akses ditolak. API Key diperlukan.' });
    }

    try {
        const user = await User.findOne({ apiKey: apiKey }).select('-password'); // Exclude password
        if (!user) {
            return res.status(403).json({ success: false, message: 'API Key tidak valid atau tidak ditemukan.' });
        }
        req.apiUser = user;
        next();
    } catch (error) {
        console.error("API Key Auth Error:", error);
        res.status(500).json({ success: false, message: 'Kesalahan server saat otentikasi API Key.' });
    }
};

module.exports = apiKeyAuth;
