const User = require('../models/user');
const validator = require('validator');

exports.registerUser = async (req, res) => {
    const { name, email, password, confirm_password, role } = req.body;
    let errors = [];

    if (!name || !email || !password || !confirm_password || !role) {
        errors.push({ msg: 'Mohon isi semua field yang wajib.' });
    }
    if (password !== confirm_password) {
        errors.push({ msg: 'Password tidak cocok.' });
    }
    if (password && password.length < 6) {
        errors.push({ msg: 'Password minimal 6 karakter.' });
    }
    if (email && !validator.isEmail(email)) {
        errors.push({ msg: 'Format email tidak valid.' });
    }
    if (!['customer', 'seller'].includes(role)) {
        errors.push({ msg: 'Role tidak valid.' });
    }

    if (errors.length > 0) {
        req.flash('errors', errors);
        req.flash('name', name);
        req.flash('email', email);
        req.flash('role', role);
        return res.redirect('/register');
    }

    try {
        let user = await User.findOne({ email: email.toLowerCase() });
        if (user) {
            req.flash('error_msg', 'Email sudah terdaftar.');
            req.flash('name', name);
            req.flash('role', role);
            return res.redirect('/register');
        }
        const newUser = new User({ name, email: email.toLowerCase(), password, role });
        await newUser.save();
        req.flash('success_msg', 'Registrasi berhasil! Silakan login.');
        res.redirect('/login');
    } catch (error) {
        console.error("Register User Error:", error);
        req.flash('error_msg', 'Terjadi kesalahan server saat registrasi.');
        req.flash('name', name);
        req.flash('email', email);
        req.flash('role', role);
        res.redirect('/register');
    }
};

exports.loginUser = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        req.flash('error_msg', 'Mohon isi email dan password.');
        return res.redirect('/login');
    }
    try {
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            req.flash('error_msg', 'Email tidak terdaftar.');
            req.flash('email', email);
            return res.redirect('/login');
        }
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            req.flash('error_msg', 'Password salah.');
            req.flash('email', email);
            return res.redirect('/login');
        }
        req.session.userId = user._id;
        req.flash('success_msg', 'Login berhasil!');
        
        const redirectUrl = req.session.returnTo || '/dashboard';
        delete req.session.returnTo;
        res.redirect(redirectUrl);

    } catch (error) {
        console.error("Login User Error:", error);
        req.flash('error_msg', 'Terjadi kesalahan server saat login.');
        req.flash('email', email);
        res.redirect('/login');
    }
};

exports.logoutUser = (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error("Session destruction error:", err);
            req.flash('error_msg', 'Gagal logout.');
            return res.redirect('/');
        }
        res.clearCookie('connect.sid');
        req.flash('success_msg', 'Anda berhasil logout.');
        res.redirect('/login');
    });
};