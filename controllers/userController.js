const User = require('../models/user');
const Order = require('../models/order');
const Transaction = require('../models/transaction');
const SourceCode = require('../models/sourceCode');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode'); 
exports.getRegisterPage = (req, res) => {
    res.render('auth/register', { 
        titlePage: 'Register Akun', 
        name: req.flash('name')[0] || '',
        email: req.flash('email')[0] || '',
        role: req.flash('role')[0] || ''
    });
};

exports.getLoginPage = (req, res) => {
    res.render('auth/login', { 
        titlePage: 'Login', 
        email: req.flash('email')[0] || '' 
    });
};

exports.getDashboard = async (req, res) => {
    try {
        const user = req.user;
        const userOrders = await Order.find({ user: user._id })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('sourceCode', 'title');
        const userTransactions = await Transaction.find({ user: user._id })
            .sort({ createdAt: -1 })
            .limit(5);

        let userSc = [];
        if (user.role === 'seller' || user.role === 'admin') {
            userSc = await SourceCode.find({ seller: user._id })
                .sort({ createdAt: -1 })
                .limit(5)
                .select('title status');
        }

        res.render('user/dashboard', {
            titlePage: 'Dashboard',
            user,
            userOrders,
            userTransactions,
            userSc,
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

exports.updateProfileInfo = async (req, res) => {
    const { name, storeName, bio, location, website } = req.body;
    const updateData = {};

    if (!name || name.trim().length < 3) {
        req.flash('error_msg', 'Nama minimal 3 karakter.');
        return res.redirect('/dashboard/profile');
    }
    updateData.name = name.trim();

    if (req.user.role === 'seller' || req.user.role === 'admin') {
        updateData.storeName = storeName ? storeName.trim() : req.user.name;
        updateData.bio = bio ? bio.trim() : null;
        updateData.location = location ? location.trim() : null;
        updateData.website = website ? website.trim() : null;
    }

    if (req.file) {
        const oldProfilePicture = req.user.profilePicture;
        updateData.profilePicture = `/images/avatars/${req.file.filename}`;
        
        if (oldProfilePicture && oldProfilePicture !== '/images/default-avatar.png') {
            const oldPicPath = path.join(__dirname, '..', 'public', oldProfilePicture);
            fs.unlink(oldPicPath, (err) => {
                if (err) console.error("Error deleting old profile picture:", err);
            });
        }
    }

    try {
        await User.findByIdAndUpdate(req.user._id, updateData, { new: true, runValidators: true });
        req.flash('success_msg', 'Informasi profile berhasil diperbarui.');
        res.redirect('/dashboard/profile');
    } catch (error) {
        if (req.file) { // Jika update DB gagal, hapus file baru yang terupload
            const newPicPath = path.join(__dirname, '..', 'public', 'images', 'avatars', req.file.filename);
            fs.unlink(newPicPath, (err) => {
                if (err) console.error("Error deleting new profile picture after DB fail:", err);
            });
        }
        req.flash('error_msg', `Gagal memperbarui profile: ${error.message}`);
        res.redirect('/dashboard/profile');
    }
};

exports.changePassword = async (req, res) => {
    const { current_password, new_password, confirm_new_password } = req.body;
    if (!current_password || !new_password || !confirm_new_password) {
        req.flash('error_msg', 'Semua field password harus diisi.');
        return res.redirect('/dashboard/profile');
    }
    if (new_password.length < 6) {
        req.flash('error_msg', 'Password baru minimal 6 karakter.');
        return res.redirect('/dashboard/profile');
    }
    if (new_password !== confirm_new_password) {
        req.flash('error_msg', 'Konfirmasi password baru tidak cocok.');
        return res.redirect('/dashboard/profile');
    }

    try {
        const user = await User.findById(req.user._id);
        const isMatch = await user.comparePassword(current_password);
        if (!isMatch) {
            req.flash('error_msg', 'Password saat ini salah.');
            return res.redirect('/dashboard/profile');
        }
        user.password = new_password;
        await user.save();
        req.flash('success_msg', 'Password berhasil diubah.');
        res.redirect('/dashboard/profile');
    } catch (error) {
        req.flash('error_msg', 'Gagal mengubah password.');
        res.redirect('/dashboard/profile');
    }
};

exports.updateQrisSettings = async (req, res) => {
    const { qrisBaseCode, qrisMerchantId, qrisApiKey } = req.body;
    try {
        await User.findByIdAndUpdate(req.user._id, {
            qrisBaseCode: qrisBaseCode ? qrisBaseCode.trim() : null,
            qrisMerchantId: qrisMerchantId ? qrisMerchantId.trim() : null,
            qrisApiKey: qrisApiKey ? qrisApiKey.trim() : null,
        });
        req.flash('success_msg', 'Pengaturan QRIS berhasil disimpan.');
        res.redirect('/dashboard/profile#qris-settings');
    } catch (error) {
        req.flash('error_msg', 'Gagal menyimpan pengaturan QRIS.');
        res.redirect('/dashboard/profile#qris-settings');
    }
};

exports.getOrdersPage = async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id })
            .populate('sourceCode', 'title _id')
            .sort({ createdAt: -1 });
        res.render('user/orders', { 
            titlePage: 'Riwayat Pesanan', 
            orders,
            breadcrumbs: [{ name: 'Dashboard', url: '/dashboard' }, { name: 'Riwayat Pesanan', active: true }]
        });
    } catch (error) {
        req.flash('error_msg', 'Gagal memuat riwayat pesanan.');
        res.redirect('/dashboard');
    }
};

exports.getTransactionsPage = async (req, res) => {
    try {
        const transactions = await Transaction.find({ user: req.user._id })
            .populate('sourceCode', 'title _id')
            .populate('order', 'orderType')
            .sort({ createdAt: -1 });
        res.render('user/transactions', { 
            titlePage: 'Riwayat Transaksi', 
            transactions, 
            user: req.user,
            breadcrumbs: [{ name: 'Dashboard', url: '/dashboard' }, { name: 'Riwayat Transaksi', active: true }]
        });
    } catch (error) {
        req.flash('error_msg', 'Gagal memuat riwayat transaksi.');
        res.redirect('/dashboard');
    }
};

exports.getMySourceCodesPage = async (req, res) => {
    try {
        if (req.user.role !== 'seller' && req.user.role !== 'admin') {
            req.flash('error_msg', 'Anda tidak memiliki akses ke halaman ini.');
            return res.redirect('/dashboard');
        }
        const mySourceCodes = await SourceCode.find({ seller: req.user._id })
            .sort({ createdAt: -1 });
        
        res.render('user/my_sc_list', { 
            titlePage: 'Source Code Saya', 
            mySourceCodes,
            breadcrumbs: [{ name: 'Dashboard', url: '/dashboard' }, { name: 'Source Code Saya', active: true }]
        });
    } catch (error) {
        req.flash('error_msg', 'Gagal memuat daftar source code Anda.');
        res.redirect('/dashboard');
    }
};

exports.getSellerStorePage = async (req, res) => {
    try {
        const seller = await User.findById(req.params.sellerId).select('-password -qrisBaseCode -qrisMerchantId -qrisApiKey');
        if (!seller || (seller.role !== 'seller' && seller.role !== 'admin')) {
            req.flash('error_msg', 'Seller tidak ditemukan.');
            return res.redirect('/');
        }

        const sellerSc = await SourceCode.find({ seller: seller._id, status: 'approved' })
            .sort({ createdAt: -1 })
            .limit(12); // Batasi jumlah SC yang ditampilkan di halaman toko

        const storeUrl = `${req.protocol}://${req.get('host')}/seller/${seller._id}`;
        const qrCodeDataUrl = await QRCode.toDataURL(storeUrl, { errorCorrectionLevel: 'H', margin: 2, width: 200 });

        res.render('user/seller_store', {
            titlePage: `Toko ${seller.storeName || seller.name}`,
            seller,
            sellerSc,
            qrCodeDataUrl,
            storeUrl,
            breadcrumbs: [{ name: 'Marketplace', url: '/' }, { name: `Toko ${seller.storeName || seller.name}`, active: true }]
        });
    } catch (error) {
        req.flash('error_msg', 'Gagal memuat halaman toko seller.');
        res.redirect('/');
    }
};