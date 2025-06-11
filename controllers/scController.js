const SourceCode = require('../models/sourceCode');
const User = require('../models/user');
const Order = require('../models/order');
const Review = require('../models/review');
const fs = require('fs');
const path = require('path');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

exports.getScListPage = async (req, res) => {
    try {
        let query = { status: 'approved', isPublic: true }; // Hanya tampilkan yang public
        const { keyword, category, sort, minPrice, maxPrice, productType } = req.query;

        if (keyword) {
            query.$or = [
                { title: { $regex: keyword, $options: 'i' } },
                { description: { $regex: keyword, $options: 'i' } },
                { tags: { $regex: keyword, $options: 'i' } }
            ];
        }
        if (category) { query.category = category; }
        if (productType) { query.productType = productType; }

        if (minPrice || maxPrice) {
            query.price_buy = {};
            if (minPrice) query.price_buy.$gte = parseInt(minPrice);
            if (maxPrice) query.price_buy.$lte = parseInt(maxPrice);
        }

        let sortOption = { createdAt: -1 };
        if (sort) {
            if (sort === 'price_asc') sortOption = { price_buy: 1 };
            if (sort === 'price_desc') sortOption = { price_buy: -1 };
            if (sort === 'rating_desc') sortOption = { averageRating: -1 };
        }

        const sourceCodes = await SourceCode.find(query)
            .populate('seller', 'name storeName profilePicture')
            .sort(sortOption);
        const categories = await SourceCode.distinct('category', { status: 'approved', isPublic: true });

        res.render('sc/list', {
            titlePage: 'Semua Produk',
            sourceCodes,
            categories,
            currentFilters: req.query,
            breadcrumbs: [{ name: 'Semua Produk', active: true }]
        });
    } catch (error) {
        console.error("Error in getScListPage:", error);
        req.flash('error_msg', 'Gagal memuat daftar produk.');
        res.redirect('/');
    }
};

exports.getAddScPage = (req, res) => {
    const formInput = req.flash('formInput')[0] || {};
    const rental_options_data = [];
    if (formInput.rental_duration && Array.isArray(formInput.rental_duration)) {
        for (let i = 0; i < formInput.rental_duration.length; i++) {
            if (formInput.rental_duration[i] && formInput.rental_price && formInput.rental_price[i]) {
                rental_options_data.push({
                    duration: formInput.rental_duration[i],
                    price: formInput.rental_price[i]
                });
            }
        }
    }
    res.render('sc/add', {
        titlePage: 'Tambah Produk Baru',
        breadcrumbs: [
            { name: 'Dashboard', url: '/dashboard' },
            { name: 'Produk Saya', url: '/dashboard/my-sc' },
            { name: 'Tambah Produk', active: true }
        ],
        title: formInput.title,
        description: formInput.description,
        category: formInput.category,
        productType: formInput.productType,
        tags: formInput.tags,
        techStack: formInput.techStack,
        demoUrl: formInput.demoUrl,
        is_for_rent_only: formInput.is_for_rent_only === 'on' || formInput.is_for_rent_only === true,
        price_buy_str: formInput.price_buy_str,
        rental_options_data: rental_options_data,
        panelRamMB: formInput.panelRamMB,
        panelDiskMB: formInput.panelDiskMB,
        panelCpuPercentage: formInput.panelCpuPercentage,
        panel_price: formInput.panel_price
    });
};

exports.createSc = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        if (req.files && req.files.sc_file) {
            req.files.sc_file.forEach(f => fs.unlink(f.path, err => { if (err) console.error("Error deleting sc_file on validation fail (createSc):", err); }));
        }
        if (req.files && req.files.screenshots) {
            req.files.screenshots.forEach(f => fs.unlink(f.path, err => { if (err) console.error("Error deleting screenshot on validation fail (createSc):", err); }));
        }
        req.flash('error_msg', errors.array().map(err => err.msg).join('<br>'));
        req.flash('formInput', req.body);
        return res.redirect('/sc/add');
    }

    const { title, description, category, productType, tags, techStack, demoUrl, is_for_rent_only, price_buy_str, rental_duration, rental_price, panelRamMB, panelDiskMB, panelCpuPercentage, panel_price } = req.body;
    const scFileArray = req.files && req.files.sc_file ? req.files.sc_file : [];
    const screenshotsArray = req.files && req.files.screenshots ? req.files.screenshots : [];
    const scFile = scFileArray.length > 0 ? scFileArray[0] : null;

    try {
        const newScData = {
            title, description, category, productType, seller: req.user.id, status: 'approved', isPublic: true
        };

        if (productType === 'source_code') {
            if (!scFile) {
                req.flash('error_msg', 'File source code wajib diupload untuk tipe produk Source Code.');
                req.flash('formInput', req.body);
                if (screenshotsArray.length > 0) screenshotsArray.forEach(f => fs.unlink(f.path, err => { if (err) console.error("Error deleting screenshot on sc_file missing:", err);}));
                return res.redirect('/sc/add');
            }
            newScData.filePath = `/uploads/sc_files/${scFile.filename}`;
            newScData.screenshots = screenshotsArray.map(file => `/uploads/screenshots/${file.filename}`);
            newScData.tags = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
            newScData.techStack = techStack ? techStack.split(',').map(tech => tech.trim()).filter(tech => tech) : [];
            newScData.demoUrl = demoUrl;
            newScData.is_for_rent_only = is_for_rent_only === 'on';
            newScData.price_buy = (!newScData.is_for_rent_only && price_buy_str !== '' && price_buy_str !== null && price_buy_str !== undefined) ? parseFloat(price_buy_str) : null;
             if(newScData.price_buy !== null && newScData.price_buy < 0) newScData.price_buy = 0;

            if (rental_duration && rental_price) {
                const durations = Array.isArray(rental_duration) ? rental_duration : [rental_duration];
                const prices = Array.isArray(rental_price) ? rental_price : [rental_price];
                newScData.rental_options = durations.map((duration, i) => ({
                    duration: duration, price: parseFloat(prices[i]) < 0 ? 0 : parseFloat(prices[i])
                })).filter(opt => opt.duration && typeof opt.price === 'number' && opt.price >= 0);
            }
            if (!newScData.is_for_rent_only && newScData.price_buy === null && (!newScData.rental_options || newScData.rental_options.length === 0)) {
                req.flash('error_msg', 'Untuk Source Code, harga jual atau minimal satu opsi sewa harus diisi.');
                req.flash('formInput', req.body);
                if (scFile) fs.unlink(scFile.path, err => { if (err) console.error("Error deleting sc_file on pricing error:", err); });
                if (screenshotsArray.length > 0) screenshotsArray.forEach(f => fs.unlink(f.path, err => { if (err) console.error("Error deleting screenshot on pricing error:", err);}));
                return res.redirect('/sc/add');
            }
        } else if (productType === 'panel_service') {
            newScData.panelRamMB = parseInt(panelRamMB) >= 0 ? parseInt(panelRamMB) : 0;
            newScData.panelDiskMB = parseInt(panelDiskMB) >= 0 ? parseInt(panelDiskMB) : 0;
            newScData.panelCpuPercentage = parseInt(panelCpuPercentage) >= 0 ? parseInt(panelCpuPercentage) : 0;
            const parsedPanelPrice = parseFloat(panel_price);
            if (isNaN(parsedPanelPrice) || parsedPanelPrice < 0 || parsedPanelPrice > 100000) {
                req.flash('error_msg', 'Harga layanan panel tidak valid (0 - 100.000).');
                req.flash('formInput', req.body);
                return res.redirect('/sc/add');
            }
            newScData.price_buy = parsedPanelPrice;
            newScData.is_for_rent_only = false;
            newScData.rental_options = [];
            newScData.filePath = null;
            newScData.screenshots = [];
        } else {
            req.flash('error_msg', 'Tipe produk tidak valid.');
            req.flash('formInput', req.body);
            return res.redirect('/sc/add');
        }

        const newSc = new SourceCode(newScData);
        await newSc.save();
        req.flash('success_msg', 'Produk berhasil ditambahkan dan langsung aktif.');
        res.redirect('/dashboard/my-sc');
    } catch (error) {
        console.error("Error in createSc:", error);
        if (scFile) fs.unlink(scFile.path, err => { if (err) console.error("Error deleting sc_file on db save fail (createSc):", err); });
        if (screenshotsArray.length > 0) screenshotsArray.forEach(f => fs.unlink(f.path, err => { if (err) console.error("Error deleting screenshot on db save fail (createSc):", err);}));
        req.flash('error_msg', 'Gagal menambahkan produk: ' + error.message);
        req.flash('formInput', req.body);
        res.redirect('/sc/add');
    }
};

exports.getScDetailPage = async (req, res, next) => {
    try {
        let query = { _id: req.params.id };
        if (!res.locals.currentUser || res.locals.currentUser.role !== 'admin') {
             query.status = 'approved';
             query.isPublic = true;
        }
        
        const sc = await SourceCode.findOne(query)
            .populate('seller', 'name storeName profilePicture email qrisBaseCode qrisMerchantId qrisApiKey pterodactylPanelUrl pterodactylAppApiKey pterodactylDefaultNestId pterodactylDefaultEggId pterodactylDefaultLocationId')
            .populate({
                path: 'reviews',
                populate: { path: 'user', select: 'name profilePicture' },
                options: { sort: { createdAt: -1 } }
            });

        if (!sc) {
            req.flash('error_msg', 'Produk tidak ditemukan atau tidak publik.');
            return res.redirect('/sc-list');
        }
        if (sc.status !== 'approved' && (!res.locals.currentUser || (res.locals.currentUser._id.toString() !== sc.seller._id.toString() && res.locals.currentUser.role !== 'admin'))) {
            req.flash('error_msg', 'Produk ini sedang dalam peninjauan atau tidak aktif.');
            return res.redirect('/sc-list');
        }
        
        let existingOrder = null;
        let hasPurchasedOrRented = false;
        let hasReviewed = false;

        if (res.locals.currentUser) {
            existingOrder = await Order.findOne({
                user: res.locals.currentUser._id,
                sourceCode: sc._id,
                paymentStatus: 'completed'
            }).sort({createdAt: -1});

            if(existingOrder){
                hasPurchasedOrRented = true;
                 if (existingOrder.orderType === 'rent' && existingOrder.rentalEndDate && new Date() > new Date(existingOrder.rentalEndDate)) {
                    hasPurchasedOrRented = false;
                }
            }
            const userReview = await Review.findOne({ user: res.locals.currentUser._id, sourceCode: sc._id });
            if (userReview) hasReviewed = true;
        }
        
        if (existingOrder && existingOrder.orderType === 'buy' && existingOrder.paymentStatus === 'completed' && sc.productType === 'source_code' && sc.filePath && !existingOrder.downloadLink) {
            existingOrder.downloadLink = sc.filePath;
        }

        res.render('sc/detail', {
            titlePage: sc.title, sc, reviews: sc.reviews, existingOrder,
            hasPurchasedOrRented, hasReviewed,
            breadcrumbs: [ { name: 'Semua Produk', url: '/sc-list' }, { name: sc.title, active: true }]
        });
    } catch (error) {
        console.error("Error in getScDetailPage:", error);
        if (error instanceof mongoose.Error.CastError) {
             req.flash('error_msg', 'ID Produk tidak valid.');
             return res.redirect('/sc-list');
        }
        req.flash('error_msg', 'Gagal memuat detail produk.');
        res.redirect('/sc-list');
    }
};

exports.getEditScPage = async (req, res) => {
    try {
        const sc = await SourceCode.findById(req.params.id);
        if (!sc) {
            req.flash('error_msg', 'Produk tidak ditemukan.');
            return res.redirect('/dashboard/my-sc');
        }
        if (sc.seller.toString() !== req.user.id && req.user.role !== 'admin') {
            req.flash('error_msg', 'Anda tidak berhak mengedit produk ini.');
            return res.redirect('/dashboard/my-sc');
        }
        const formInput = req.flash('formInput')[0] || {};
        res.render('sc/edit', {
            titlePage: `Edit ${sc.title}`, sc,
            breadcrumbs: [
                { name: 'Dashboard', url: '/dashboard' },
                { name: 'Produk Saya', url: '/dashboard/my-sc' },
                { name: `Edit: ${sc.title.substring(0,20)}...`, active: true }
            ],
            title: formInput.title || sc.title,
            description: formInput.description || sc.description,
            category: formInput.category || sc.category,
            productType: formInput.productType || sc.productType,
            tags: formInput.tags ? formInput.tags : (sc.tags ? sc.tags.join(', ') : ''),
            techStack: formInput.techStack ? formInput.techStack : (sc.techStack ? sc.techStack.join(', ') : ''),
            demoUrl: formInput.demoUrl || sc.demoUrl,
            is_for_rent_only: typeof formInput.is_for_rent_only !== 'undefined' ? (formInput.is_for_rent_only === 'on' || formInput.is_for_rent_only === true) : sc.is_for_rent_only,
            price_buy_str: formInput.price_buy_str !== undefined ? formInput.price_buy_str : sc.price_buy,
            rental_options_data: formInput.rental_duration ? formInput.rental_duration.map((dur, i) => ({ duration: dur, price: formInput.rental_price[i] })) : sc.rental_options,
            panelRamMB: formInput.panelRamMB !== undefined ? formInput.panelRamMB : sc.panelRamMB,
            panelDiskMB: formInput.panelDiskMB !== undefined ? formInput.panelDiskMB : sc.panelDiskMB,
            panelCpuPercentage: formInput.panelCpuPercentage !== undefined ? formInput.panelCpuPercentage : sc.panelCpuPercentage,
            panel_price: formInput.panel_price !== undefined ? formInput.panel_price : (sc.productType === 'panel_service' ? sc.price_buy : ''),
            isPublic: typeof formInput.isPublic !== 'undefined' ? (formInput.isPublic === 'on' || formInput.isPublic === true) : sc.isPublic
        });
    } catch (error) {
        console.error("Error in getEditScPage:", error);
        req.flash('error_msg', 'Gagal memuat halaman edit produk.');
        res.redirect('/dashboard/my-sc');
    }
};

exports.updateSc = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        if (req.files && req.files.sc_file) req.files.sc_file.forEach(f => fs.unlink(f.path, err => { if (err) console.error("Error deleting sc_file on validation fail (updateSc):", err);}));
        if (req.files && req.files.screenshots) req.files.screenshots.forEach(f => fs.unlink(f.path, err => { if (err) console.error("Error deleting screenshot on validation fail (updateSc):", err);}));
        req.flash('error_msg', errors.array().map(err => err.msg).join('<br>'));
        req.flash('formInput', req.body);
        return res.redirect(`/sc/edit/${req.params.id}`);
    }
    
    try {
        const sc = await SourceCode.findById(req.params.id);
        if (!sc) {
            req.flash('error_msg', 'Produk tidak ditemukan.');
            return res.redirect('/dashboard/my-sc');
        }
        if (sc.seller.toString() !== req.user.id && req.user.role !== 'admin') {
            req.flash('error_msg', 'Anda tidak berhak mengedit produk ini.');
            return res.redirect('/dashboard/my-sc');
        }

        const { title, description, category, productType, tags, techStack, demoUrl, is_for_rent_only, price_buy_str, rental_duration, rental_price, panelRamMB, panelDiskMB, panelCpuPercentage, panel_price, isPublic } = req.body;
        const scFileArray = req.files && req.files.sc_file ? req.files.sc_file : [];
        const screenshotsArray = req.files && req.files.screenshots ? req.files.screenshots : [];
        const newScFile = scFileArray.length > 0 ? scFileArray[0] : null;
        
        sc.title = title;
        sc.description = description;
        sc.category = category;
        sc.productType = productType;
        sc.isPublic = isPublic === 'on';

        if (productType === 'source_code') {
            if (newScFile) {
                if (sc.filePath && fs.existsSync(path.join(__dirname, '..', 'public', sc.filePath))) {
                    fs.unlink(path.join(__dirname, '..', 'public', sc.filePath), err => { if (err) console.error("Error deleting old sc_file (updateSc):", err); });
                }
                sc.filePath = `/uploads/sc_files/${newScFile.filename}`;
            }
            if (screenshotsArray.length > 0) {
                if (sc.screenshots && sc.screenshots.length > 0) {
                    sc.screenshots.forEach(oldSs => {
                        if (fs.existsSync(path.join(__dirname, '..', 'public', oldSs))) {
                             fs.unlink(path.join(__dirname, '..', 'public', oldSs), err => { if (err) console.error("Error deleting old screenshot (updateSc):", err); });
                        }
                    });
                }
                sc.screenshots = screenshotsArray.map(file => `/uploads/screenshots/${file.filename}`);
            }
            sc.tags = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
            sc.techStack = techStack ? techStack.split(',').map(tech => tech.trim()).filter(tech => tech) : [];
            sc.demoUrl = demoUrl;
            sc.is_for_rent_only = is_for_rent_only === 'on';
            sc.price_buy = (!sc.is_for_rent_only && price_buy_str !== '' && price_buy_str !== null && price_buy_str !== undefined) ? parseFloat(price_buy_str) : null;
            if(sc.price_buy !== null && sc.price_buy < 0) sc.price_buy = 0;

            sc.rental_options = [];
            if (rental_duration && rental_price) {
                const durations = Array.isArray(rental_duration) ? rental_duration : [rental_duration];
                const prices = Array.isArray(rental_price) ? rental_price : [rental_price];
                sc.rental_options = durations.map((duration, i) => ({
                    duration: duration, price: parseFloat(prices[i]) < 0 ? 0 : parseFloat(prices[i])
                })).filter(opt => opt.duration && typeof opt.price === 'number' && opt.price >= 0);
            }
            if (!sc.is_for_rent_only && sc.price_buy === null && (!sc.rental_options || sc.rental_options.length === 0)) {
                 req.flash('error_msg', 'Untuk Source Code, harga jual atau minimal satu opsi sewa harus diisi.');
                 req.flash('formInput', req.body);
                 if (newScFile) fs.unlink(newScFile.path, err => { if (err) console.error("Error deleting new sc_file on pricing error (updateSc):", err); });
                 if (screenshotsArray.length > 0) screenshotsArray.forEach(f => fs.unlink(f.path, err => { if (err) console.error("Error deleting new screenshot on pricing error (updateSc):", err);}));
                 return res.redirect(`/sc/edit/${req.params.id}`);
            }
            sc.panelRamMB = null; sc.panelDiskMB = null; sc.panelCpuPercentage = null;
        } else if (productType === 'panel_service') {
            sc.panelRamMB = parseInt(panelRamMB) >= 0 ? parseInt(panelRamMB) : 0;
            sc.panelDiskMB = parseInt(panelDiskMB) >= 0 ? parseInt(panelDiskMB) : 0;
            sc.panelCpuPercentage = parseInt(panelCpuPercentage) >= 0 ? parseInt(panelCpuPercentage) : 0;
            const parsedPanelPrice = parseFloat(panel_price);
            if (isNaN(parsedPanelPrice) || parsedPanelPrice < 0 || parsedPanelPrice > 100000) {
                req.flash('error_msg', 'Harga layanan panel tidak valid (0 - 100.000).');
                req.flash('formInput', req.body);
                return res.redirect(`/sc/edit/${req.params.id}`);
            }
            sc.price_buy = parsedPanelPrice;
            sc.is_for_rent_only = false; sc.rental_options = [];
            if (sc.filePath && fs.existsSync(path.join(__dirname, '..', 'public', sc.filePath))) {
                fs.unlink(path.join(__dirname, '..', 'public', sc.filePath), err => { if (err) console.error("Error deleting old sc_file when switching to panel (updateSc):", err); });
            }
            sc.filePath = null;
            if (sc.screenshots && sc.screenshots.length > 0) {
                 sc.screenshots.forEach(oldSs => {
                    if (fs.existsSync(path.join(__dirname, '..', 'public', oldSs))) {
                         fs.unlink(path.join(__dirname, '..', 'public', oldSs), err => { if (err) console.error("Error deleting old screenshot when switching to panel (updateSc):", err); });
                    }
                });
            }
            sc.screenshots = [];
            sc.tags = []; sc.techStack = []; sc.demoUrl = null;
        }

        sc.status = 'approved';
        await sc.save();
        req.flash('success_msg', 'Produk berhasil diperbarui dan langsung aktif.');
        res.redirect('/dashboard/my-sc');

    } catch (error) {
        console.error("Error in updateSc:", error);
        const scFileArrayUpdate = req.files && req.files.sc_file ? req.files.sc_file : [];
        const screenshotsArrayUpdate = req.files && req.files.screenshots ? req.files.screenshots : [];
        if (scFileArrayUpdate.length > 0) scFileArrayUpdate.forEach(f => fs.unlink(f.path, err => { if (err) console.error("Error deleting sc_file on db save fail (updateSc):", err);}));
        if (screenshotsArrayUpdate.length > 0) screenshotsArrayUpdate.forEach(f => fs.unlink(f.path, err => { if (err) console.error("Error deleting screenshot on db save fail (updateSc):", err);}));
        req.flash('error_msg', 'Gagal memperbarui produk: ' + error.message);
        req.flash('formInput', req.body);
        res.redirect(`/sc/edit/${req.params.id}`);
    }
};

exports.deleteSc = async (req, res) => {
    try {
        const sc = await SourceCode.findById(req.params.id);
        if (!sc) {
            req.flash('error_msg', 'Produk tidak ditemukan.');
            return res.redirect('/dashboard/my-sc');
        }
        if (sc.seller.toString() !== req.user.id && req.user.role !== 'admin') {
            req.flash('error_msg', 'Anda tidak berhak menghapus produk ini.');
            return res.redirect('/dashboard/my-sc');
        }

        if (sc.filePath && fs.existsSync(path.join(__dirname, '..', 'public', sc.filePath))) {
            fs.unlinkSync(path.join(__dirname, '..', 'public', sc.filePath));
        }
        if (sc.screenshots && sc.screenshots.length > 0) {
            sc.screenshots.forEach(ssPath => {
                if (fs.existsSync(path.join(__dirname, '..', 'public', ssPath))) {
                    fs.unlinkSync(path.join(__dirname, '..', 'public', ssPath));
                }
            });
        }
        
        await Review.deleteMany({ sourceCode: sc._id });
        await Order.updateMany({ sourceCode: sc._id }, { $set: { sourceCode: null, scTitleAtPurchase: `${sc.title} (Dihapus)` } });
        await SourceCode.findByIdAndDelete(req.params.id);

        req.flash('success_msg', 'Produk berhasil dihapus.');
        res.redirect('/dashboard/my-sc');
    } catch (error) {
        console.error("Error in deleteSc:", error);
        req.flash('error_msg', 'Gagal menghapus produk.');
        res.redirect('/dashboard/my-sc');
    }
};

exports.addScReview = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash('error_msg', errors.array().map(err => err.msg).join('<br>'));
        return res.redirect(`/sc/${req.params.id}#nav-reviews`);
    }
    const { rating, comment } = req.body;
    try {
        const scObject = await SourceCode.findById(req.params.id);
        if (!scObject) {
            req.flash('error_msg', 'Produk tidak ditemukan.');
            return res.redirect('/sc-list');
        }

        const existingReview = await Review.findOne({ user: req.user.id, sourceCode: scObject._id });
        if (existingReview) {
            req.flash('error_msg', 'Anda sudah memberikan ulasan untuk produk ini.');
            return res.redirect(`/sc/${scObject._id}#nav-reviews`);
        }
        
        const hasPurchasedOrRented = await Order.findOne({
            user: req.user.id, sourceCode: scObject._id, paymentStatus: 'completed'
        });

        if (!hasPurchasedOrRented) {
             req.flash('error_msg', 'Anda harus membeli atau menyewa produk ini untuk memberi ulasan.');
            return res.redirect(`/sc/${scObject._id}#nav-reviews`);
        }

        const review = new Review({
            user: req.user.id,
            sourceCode: scObject._id,
            rating: parseInt(rating),
            comment
        });
        await review.save();

        req.flash('success_msg', 'Ulasan berhasil ditambahkan.');
        res.redirect(`/sc/${scObject._id}#nav-reviews`);
    } catch (error) {
        console.error("Error in addScReview:", error);
        req.flash('error_msg', 'Gagal menambahkan ulasan: ' + error.message);
        res.redirect(`/sc/${req.params.id}#nav-reviews`);
    }
};

exports.getQuickViewSc = async (req, res) => {
    try {
        const sc = await SourceCode.findById(req.params.id)
            .select('title description category price_buy rental_options screenshots seller averageRating totalReviews productType panelRamMB panelDiskMB panelCpuPercentage')
            .populate('seller', 'name storeName');

        if (!sc || sc.status !== 'approved' || !sc.isPublic) {
            return res.status(404).json({ message: 'Produk tidak ditemukan atau tidak publik.' });
        }
        res.json(sc);
    } catch (error) {
        console.error("Error in getQuickViewSc:", error);
        res.status(500).json({ message: 'Gagal memuat detail cepat produk.' });
    }
};

exports.toggleProductVisibility = async (req, res) => {
    try {
        const sc = await SourceCode.findById(req.params.id);
        if (!sc) {
            req.flash('error_msg', 'Produk tidak ditemukan.');
            return res.redirect('/dashboard/my-sc');
        }
        if (sc.seller.toString() !== req.user.id && req.user.role !== 'admin') {
            req.flash('error_msg', 'Anda tidak berhak mengubah visibilitas produk ini.');
            return res.redirect('/dashboard/my-sc');
        }

        sc.isPublic = !sc.isPublic;
        await sc.save();

        req.flash('success_msg', `Visibilitas produk "${sc.title}" berhasil diubah menjadi ${sc.isPublic ? 'Publik' : 'Disembunyikan'}.`);
        res.redirect('/dashboard/my-sc');
    } catch (error) {
        console.error("Error in toggleProductVisibility:", error);
        req.flash('error_msg', 'Gagal mengubah visibilitas produk.');
        res.redirect('/dashboard/my-sc');
    }
};