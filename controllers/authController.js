const User = require('../models/user');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

exports.registerUser = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash('error_msg', errors.array().map(err => err.msg).join('<br>'));
        req.flash('formInput', req.body);
        return res.redirect('/register');
    }

    const { name, email, password, role } = req.body;

    try {
        let user = await User.findOne({ email });
        if (user) {
            req.flash('error_msg', 'Email sudah terdaftar.');
            req.flash('formInput', req.body);
            return res.redirect('/register');
        }

        user = new User({
            name,
            email,
            password,
            role
        });

        await user.save();

        const payload = {
            id: user.id,
            name: user.name,
            role: user.role
        };

        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // true jika https
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 hari
        });

        req.flash('success_msg', 'Registrasi berhasil! Selamat datang.');
        res.redirect('/dashboard');

    } catch (err) {
        console.error('Error in registerUser:', err.message);
        req.flash('error_msg', 'Terjadi kesalahan pada server.');
        req.flash('formInput', req.body);
        res.redirect('/register');
    }
};

exports.loginUser = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash('error_msg', errors.array().map(err => err.msg).join('<br>'));
        req.flash('formInput', req.body);
        return res.redirect('/login');
    }

    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            req.flash('error_msg', 'Email atau password salah.');
            req.flash('formInput', req.body);
            return res.redirect('/login');
        }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            req.flash('error_msg', 'Email atau password salah.');
            req.flash('formInput', req.body);
            return res.redirect('/login');
        }

        const payload = {
            id: user.id,
            name: user.name,
            role: user.role
        };

        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        
        const redirectUrl = req.query.redirect || '/dashboard';
        req.flash('success_msg', 'Login berhasil!');
        res.redirect(redirectUrl);

    } catch (err) {
        console.error('Error in loginUser:', err.message);
        req.flash('error_msg', 'Terjadi kesalahan pada server.');
        req.flash('formInput', req.body);
        res.redirect('/login');
    }
};

exports.logoutUser = (req, res) => {
    res.clearCookie('token');
    req.flash('success_msg', 'Anda berhasil logout.');
    res.redirect('/login');
};