const SourceCode = require('../models/sourceCode');
exports.getHomePage = async (req, res) => {
    try {
        const latestSc = await SourceCode.find({ status: 'approved' })
            .sort({ createdAt: -1 })
            .limit(6)
            .populate('seller', 'name');
        res.render('index', { 
            titlePage: 'Selamat Datang',
            latestSc 
        });
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Gagal memuat halaman utama.');
        res.redirect('/');
    }
};

exports.getScListPage = async (req, res) => {
    try {
        const sourceCodes = await SourceCode.find({ status: 'approved' })
            .populate('seller', 'name')
            .sort({ createdAt: -1 });
        res.render('sc/list', { 
            titlePage: 'Semua Source Code',
            sourceCodes 
        });
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Gagal memuat daftar source code.');
        res.redirect('/');
    }
};