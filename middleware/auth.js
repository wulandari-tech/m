module.exports.isAuthenticated = (req, res, next) => {
    if (req.session.userId && req.user) {
        return next();
    }
    req.session.returnTo = req.originalUrl; // Simpan URL yang diminta
    req.flash('error_msg', 'Silakan login untuk mengakses halaman ini.');
    res.redirect('/login');
};

module.exports.isSeller = (req, res, next) => {
    if (req.user && (req.user.role === 'seller' || req.user.role === 'admin')) {
        return next();
    }
    req.session.returnTo = req.originalUrl;
    req.flash('error_msg', 'Anda tidak memiliki akses seller.');
    res.redirect('/');
};

module.exports.isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        return next();
    }
    req.session.returnTo = req.originalUrl;
    req.flash('error_msg', 'Akses ditolak. Hanya untuk Admin.');
    res.redirect('/');
};

module.exports.forwardAuthenticated = (req, res, next) => {
    if (req.session.userId && req.user) { // Pastikan user juga ada di req.user
        return res.redirect('/dashboard');
    }
    next();
};