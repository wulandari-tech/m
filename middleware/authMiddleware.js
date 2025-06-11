const jwt = require('jsonwebtoken');
const User = require('../models/user');

exports.ensureAuthenticated = async (req, res, next) => {
    const token = req.cookies.token;
    if (!token) {
        req.flash('error_msg', 'Silakan login untuk mengakses halaman ini');
        return res.redirect(`/login?redirect=${encodeURIComponent(req.originalUrl)}`);
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
            res.clearCookie('token');
            req.flash('error_msg', 'User tidak ditemukan atau token tidak valid.');
            return res.redirect(`/login?redirect=${encodeURIComponent(req.originalUrl)}`);
        }
        req.user = user;
        res.locals.currentUser = user;
        if (req.session) {
            req.session.userId = user._id.toString();
            req.session.userName = user.name;
            req.session.role = user.role;
        }
        next();
    } catch (err) {
        console.error("JWT Verification Error in ensureAuthenticated:", err.message);
        res.clearCookie('token');
        req.flash('error_msg', 'Sesi tidak valid atau kedaluwarsa, silakan login kembali.');
        return res.redirect(`/login?redirect=${encodeURIComponent(req.originalUrl)}`);
    }
};

exports.ensureGuest = (req, res, next) => {
    if (req.cookies.token) {
        try {
            const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
            if (decoded && decoded.id) {
                return res.redirect('/dashboard');
            }
        } catch (err) {
            res.clearCookie('token');
        }
    }
    next();
};

exports.ensureAdmin = (req, res, next) => {
    if (res.locals.currentUser && res.locals.currentUser.role === 'admin') {
        return next();
    }
    req.flash('error_msg', 'Akses ditolak. Hanya admin yang dapat mengakses halaman ini.');
    res.redirect('/');
};

exports.ensureSeller = (req, res, next) => {
    if (res.locals.currentUser && res.locals.currentUser.role === 'seller') {
        return next();
    }
    req.flash('error_msg', 'Akses ditolak. Hanya seller yang dapat mengakses halaman ini.');
    res.redirect('/');
};

exports.ensureSellerOrAdmin = (req, res, next) => {
    if (res.locals.currentUser && (res.locals.currentUser.role === 'seller' || res.locals.currentUser.role === 'admin')) {
        return next();
    }
    req.flash('error_msg', 'Akses ditolak. Hanya seller atau admin yang dapat mengakses halaman ini.');
    res.redirect('/');
};

exports.checkUserOptional = async (req, res, next) => {
    const token = req.cookies.token;
    res.locals.currentUser = null;
    req.user = null;

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id).select('-password');
            if (user) {
                req.user = user;
                res.locals.currentUser = user;
                if (req.session) {
                    req.session.userId = user._id.toString();
                    req.session.userName = user.name;
                    req.session.role = user.role;
                }
            } else {
                res.clearCookie('token');
            }
        } catch (err) {
            res.clearCookie('token');
        }
    }
    next();
};