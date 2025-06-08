const User = require('../models/user');
const SourceCode = require('../models/sourceCode');

exports.getUsersPage = async (req, res) => {
    try {
        const users = await User.find().sort({ createdAt: -1 });
        res.render('admin/users', { titlePage: 'Manajemen Pengguna', users });
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Gagal memuat daftar pengguna.');
        res.redirect('/dashboard');
    }
};

exports.getScManagementPage = async (req, res) => {
    try {
        const sourceCodes = await SourceCode.find()
            .populate('seller', 'name')
            .sort({ status: 1, createdAt: -1 }); 
        res.render('admin/sc-management', { titlePage: 'Manajemen Source Code', sourceCodes });
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Gagal memuat daftar source code untuk manajemen.');
        res.redirect('/dashboard');
    }
};

exports.approveSc = async (req, res) => {
    try {
        const sc = await SourceCode.findById(req.params.id);
        if (!sc) {
            req.flash('error_msg', 'Source code tidak ditemukan.');
            return res.redirect('/admin/sc-management');
        }
        sc.status = 'approved';
        await sc.save();
        req.flash('success_msg', `Source code "${sc.title}" berhasil disetujui.`);
        res.redirect('/admin/sc-management');
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Gagal menyetujui source code.');
        res.redirect('/admin/sc-management');
    }
};

exports.rejectSc = async (req, res) => {
     try {
        const sc = await SourceCode.findById(req.params.id);
        if (!sc) {
            req.flash('error_msg', 'Source code tidak ditemukan.');
            return res.redirect('/admin/sc-management');
        }
        sc.status = 'rejected';
        await sc.save();
        req.flash('success_msg', `Source code "${sc.title}" berhasil ditolak.`);
        res.redirect('/admin/sc-management');
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Gagal menolak source code.');
        res.redirect('/admin/sc-management');
    }
};