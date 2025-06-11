const User = require('../models/user');
const Order = require('../models/order');
const Transaction = require('../models/transaction');
const SourceCode = require('../models/sourceCode');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const { validationResult } = require('express-validator');
const crypto = require('crypto'); 
exports.getRegisterPage = (req, res) => {
    const formInput = req.flash('formInput')[0] || {};
    res.render('auth/register', {
        titlePage: 'Register Akun',
        name: formInput.name || '',
        email: formInput.email || '',
        role: formInput.role || ''
    });
};

exports.getLoginPage = (req, res) => {
     const formInput = req.flash('formInput')[0] || {};
    res.render('auth/login', {
        titlePage: 'Login',
        email: formInput.email || ''
    });
};

exports.getDashboard = async (req, res) => {
    try {
        const user = res.locals.currentUser;
        const userOrders = await Order.find({ user: user._id })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate({ path: 'sourceCode', select: 'title productType' });
        const userTransactions = await Transaction.find({ user: user._id })
            .sort({ createdAt: -1 })
            .limit(5);
        let userSc = [];
        if (user.role === 'seller' || user.role === 'admin') {
            userSc = await SourceCode.find({ seller: user._id })
                .sort({ createdAt: -1 })
                .limit(5)
                .select('title status productType isPublic');
        }
        res.render('user/dashboard', {
            titlePage: 'Dashboard', user, userOrders, userTransactions, userSc,
            breadcrumbs: [{ name: 'Dashboard', active: true }]
        });
    } catch (error) {
        req.flash('error_msg', 'Gagal memuat dashboard.');
        res.redirect('/');
    }
};

exports.getProfilePage = (req, res) => {
    res.render('user/profile', {
        titlePage: 'Edit Profile & Toko',
        breadcrumbs: [{ name: 'Dashboard', url: '/dashboard' }, { name: 'Edit Profile & Toko', active: true }]
    });
};

exports.updateUserProfile = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        if (req.file) {
            fs.unlink(req.file.path, (err) => { if (err) console.error(err); });
        }
        req.flash('error_msg', errors.array().map(err => err.msg).join('<br>'));
        req.flash('formInput', req.body);
        return res.redirect('/dashboard/profile');
    }
    try {
        const user = await User.findById(req.user.id);
        if (!user) { req.flash('error_msg', 'User tidak ditemukan'); return res.redirect('/dashboard/profile'); }
        user.name = req.body.name || user.name;
        if (user.role === 'seller' || user.role === 'admin') {
            user.storeName = req.body.storeName || user.storeName || user.name;
            user.bio = req.body.bio || null;
            user.location = req.body.location || null;
            user.website = req.body.website || null;
        }
        if (req.file) {
            if (user.profilePicture && user.profilePicture !== '/images/default-avatar.png' && !user.profilePicture.startsWith('http')) {
                const oldPicPath = path.join(__dirname, '..', 'public', user.profilePicture);
                if (fs.existsSync(oldPicPath)) {
                    fs.unlink(oldPicPath, (err) => { if (err) console.error(err); });
                }
            }
            user.profilePicture = `/uploads/profiles/${req.file.filename}`;
        }
        await user.save();
        req.flash('success_msg', 'Profil berhasil diperbarui');
        res.redirect('/dashboard/profile');
    } catch (error) {
        if (req.file) { fs.unlink(req.file.path, (err) => { if (err) console.error(err); });}
        req.flash('error_msg', 'Terjadi kesalahan saat memperbarui profil');
        req.flash('formInput', req.body);
        res.redirect('/dashboard/profile');
    }
};

exports.changePassword = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash('error_msg', errors.array().map(err => err.msg).join('<br>'));
        return res.redirect('/dashboard/profile');
    }
    const { current_password, new_password } = req.body;
    try {
        const user = await User.findById(req.user.id);
        if (!user) { req.flash('error_msg', 'User tidak ditemukan'); return res.redirect('/dashboard/profile'); }
        const isMatch = await user.matchPassword(current_password);
        if (!isMatch) { req.flash('error_msg', 'Password saat ini salah'); return res.redirect('/dashboard/profile'); }
        user.password = new_password;
        await user.save();
        req.flash('success_msg', 'Password berhasil diubah');
        res.redirect('/dashboard/profile');
    } catch (error) {
        req.flash('error_msg', 'Terjadi kesalahan saat mengubah password');
        res.redirect('/dashboard/profile');
    }
};

exports.updateQrisSettings = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash('error_msg', errors.array().map(err => err.msg).join('<br>'));
        req.flash('formInput', req.body);
        return res.redirect('/dashboard/profile#qris-settings');
    }
    try {
        const user = await User.findById(req.user.id);
        if (!user) { req.flash('error_msg', 'User tidak ditemukan'); return res.redirect('/dashboard/profile#qris-settings'); }
        if (user.role !== 'seller' && user.role !== 'admin') {
            req.flash('error_msg', 'Hanya seller atau admin yang dapat mengatur QRIS'); return res.redirect('/dashboard');
        }
        user.qrisBaseCode = req.body.qrisBaseCode || null;
        user.qrisMerchantId = req.body.qrisMerchantId || null;
        user.qrisApiKey = req.body.qrisApiKey || null;
        await user.save();
        req.flash('success_msg', 'Pengaturan QRIS berhasil diperbarui');
        res.redirect('/dashboard/profile#qris-settings');
    } catch (error) {
        req.flash('error_msg', 'Terjadi kesalahan saat memperbarui pengaturan QRIS');
        req.flash('formInput', req.body);
        res.redirect('/dashboard/profile#qris-settings');
    }
};

exports.updateApiSettings = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash('error_msg', errors.array().map(err => err.msg).join('<br>'));
        req.flash('formInput', req.body);
        return res.redirect('/dashboard/profile#api-settings');
    }
    try {
        const user = await User.findById(req.user.id);
        if (!user) { req.flash('error_msg', 'User tidak ditemukan'); return res.redirect('/dashboard/profile#api-settings'); }
         if (user.role !== 'seller' && user.role !== 'admin') {
            req.flash('error_msg', 'Hanya seller atau admin yang dapat mengatur API'); return res.redirect('/dashboard');
        }
        user.pterodactylPanelUrl = req.body.pterodactylPanelUrl || null;
        user.pterodactylAppApiKey = req.body.pterodactylAppApiKey || null;
        user.pterodactylClientApiKey = req.body.pterodactylClientApiKey || null;
        user.pterodactylDefaultLocationId = req.body.pterodactylDefaultLocationId ? parseInt(req.body.pterodactylDefaultLocationId) : null;
        user.pterodactylDefaultNestId = req.body.pterodactylDefaultNestId ? parseInt(req.body.pterodactylDefaultNestId) : null;
        user.pterodactylDefaultEggId = req.body.pterodactylDefaultEggId ? parseInt(req.body.pterodactylDefaultEggId) : null;
        await user.save();
        req.flash('success_msg', 'Pengaturan API & Panel berhasil diperbarui');
        res.redirect('/dashboard/profile#api-settings');
    } catch (error) {
        req.flash('error_msg', 'Terjadi kesalahan saat memperbarui pengaturan API & Panel');
        req.flash('formInput', req.body);
        res.redirect('/dashboard/profile#api-settings');
    }
};

exports.regenerateApiKey = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) { req.flash('error_msg', 'User tidak ditemukan.'); return res.redirect('/dashboard/profile#developer-api-key');}
        user.generateApiKey();
        await user.save();
        req.flash('success_msg', 'API Key baru berhasil dibuat.');
        res.redirect('/dashboard/profile#developer-api-key');
    } catch (error) {
        req.flash('error_msg', 'Gagal membuat API Key baru.');
        res.redirect('/dashboard/profile#developer-api-key');
    }
};

exports.getOrdersPage = async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user.id })
            .populate('sourceCode', 'title _id productType filePath')
            .sort({ createdAt: -1 });
        res.render('user/orders', {
            titlePage: 'Riwayat Pesanan', orders,
            breadcrumbs: [{ name: 'Dashboard', url: '/dashboard' }, { name: 'Riwayat Pesanan', active: true }]
        });
    } catch (error) {
        req.flash('error_msg', 'Gagal memuat riwayat pesanan.');
        res.redirect('/dashboard');
    }
};

exports.getTransactionsPage = async (req, res) => {
    try {
        const transactions = await Transaction.find({ user: req.user.id })
            .populate('sourceCode', 'title _id productType')
            .populate('order', 'orderType')
            .sort({ createdAt: -1 });
        res.render('user/transactions', {
            titlePage: 'Riwayat Transaksi', transactions, user: res.locals.currentUser,
            breadcrumbs: [{ name: 'Dashboard', url: '/dashboard' }, { name: 'Riwayat Transaksi', active: true }]
        });
    } catch (error) {
        req.flash('error_msg', 'Gagal memuat riwayat transaksi.');
        res.redirect('/dashboard');
    }
};

exports.getMySourceCodesPage = async (req, res) => {
    try {
        if (res.locals.currentUser.role !== 'seller' && res.locals.currentUser.role !== 'admin') {
            req.flash('error_msg', 'Anda tidak memiliki akses ke halaman ini.'); return res.redirect('/dashboard');
        }
        const mySourceCodes = await SourceCode.find({ seller: req.user.id })
            .sort({ createdAt: -1 })
            .select('title status category price_buy is_for_rent_only productType isPublic');
        res.render('user/my_sc_list', {
            titlePage: 'Produk Saya', mySourceCodes,
            breadcrumbs: [{ name: 'Dashboard', url: '/dashboard' }, { name: 'Produk Saya', active: true }]
        });
    } catch (error) {
        req.flash('error_msg', 'Gagal memuat daftar produk Anda.');
        res.redirect('/dashboard');
    }
};

exports.getSellerStorePage = async (req, res) => {
    try {
        const seller = await User.findById(req.params.sellerId).select('-password -apiKey -qrisBaseCode -qrisMerchantId -qrisApiKey -pterodactylClientApiKey -pterodactylAppApiKey -resetPasswordToken -resetPasswordExpires -pterodactylDefaultLocationId -pterodactylDefaultNestId -pterodactylDefaultEggId');
        if (!seller || (seller.role !== 'seller' && seller.role !== 'admin')) {
            req.flash('error_msg', 'Seller tidak ditemukan.'); return res.redirect('/');
        }
        const sellerSc = await SourceCode.find({ seller: seller._id, status: 'approved', isPublic: true })
            .sort({ createdAt: -1 })
            .limit(12);
        const storeUrl = `${req.protocol}://${req.get('host')}/seller/${seller._id}`;
        const qrCodeDataUrl = await QRCode.toDataURL(storeUrl, { errorCorrectionLevel: 'H', margin: 2, width: 200 });
        res.render('user/seller_store', {
            titlePage: `Toko ${seller.storeName || seller.name}`, seller, sellerSc, qrCodeDataUrl, storeUrl,
            breadcrumbs: [{ name: 'Marketplace', url: '/' }, { name: `Toko ${seller.storeName || seller.name}`, active: true }]
        });
    } catch (error) {
        req.flash('error_msg', 'Gagal memuat halaman toko seller.');
        res.redirect('/');
    }
};
