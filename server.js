require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const flash = require('connect-flash');
const expressLayouts = require('express-ejs-layouts');
const cookieParser = require('cookie-parser');
const methodOverride = require('method-override');
const path = require('path');
const User = require('./models/user');

const app = express();

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB Connected...'))
    .catch(err => console.error('MongoDB Connection Error:', err));

app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layouts/main');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(methodOverride('_method'));

app.use(session({
    secret: process.env.SESSION_SECRET || 'defaultfallbacksecretforsession',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

app.use(flash());

app.use(async (req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.errors = req.flash('errors');
    
    if (req.session.userId) {
        try {
            const user = await User.findById(req.session.userId).select('-password');
            if (user) {
                res.locals.currentUser = user;
                req.user = user;
            } else {
                delete req.session.userId; // User not found, clear session
                res.locals.currentUser = null;
                req.user = null;
            }
        } catch (error) {
            console.error("Error fetching user for session:", error);
            res.locals.currentUser = null;
            req.user = null;
        }
    } else {
        res.locals.currentUser = null;
        req.user = null;
    }
    res.locals.titlePage = "SC Marketplace";
    res.locals.currentPath = req.path; 
    res.locals.process = { env: { FONT_AWESOME_KIT_ID: process.env.FONT_AWESOME_KIT_ID } }; 
    next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const indexRoutes = require('./routes/indexRoutes');
const authRoutes = require('./routes/authRoutes');
const scRoutes = require('./routes/scRoutes');
const orderRoutes = require('./routes/orderRoutes');
const balanceRoutes = require('./routes/balanceRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const ticketRoutes = require('./routes/ticketRoutes');

app.use('/', indexRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/sc', scRoutes); // POST/PUT/DELETE SC
app.use('/sc', scRoutes); // GET SC list/detail
app.use('/api/orders', orderRoutes);
app.use('/api/balance', balanceRoutes);
app.use('/', userRoutes);
app.use('/admin', adminRoutes);
app.use('/api/tickets', ticketRoutes); 
app.use((req, res, next) => {
    const err = new Error('Not Found');
    err.status = 404;
    next(err);
});

app.use((err, req, res, next) => {
    const statusCode = err.status || 500;
    res.status(statusCode);
    const titlePage = statusCode === 404 ? "Halaman Tidak Ditemukan" : "Kesalahan Server";
    const viewToRender = statusCode === 404 ? 'pages/404' : 'pages/500';
    
    console.error(`Error on path ${req.path}:`, err.message, err.status ? '' : err.stack);

    if (res.headersSent) {
      return next(err);
    }

    res.render(viewToRender, {
        titlePage,
        error: process.env.NODE_ENV === 'development' ? err.message : (statusCode === 500 ? 'Terjadi kesalahan pada server.' : err.message),
        stack: process.env.NODE_ENV === 'development' ? err.stack : null
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));