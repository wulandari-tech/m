const SourceCode = require('../models/sourceCode');
const Review = require('../models/review');
const Order = require('../models/order');
const User = require('../models/user');
const fs = require('fs');
const path = require('path');

exports.getAddScForm = (req, res) => {
    res.render('sc/add', {
        titlePage: 'Tambah Source Code',
        title: req.flash('form_title')[0] || '',
        description: req.flash('form_description')[0] || '',
        category: req.flash('form_category')[0] || '',
        tags: req.flash('form_tags')[0] || '',
        techStack: req.flash('form_techStack')[0] || '',
        demoUrl: req.flash('form_demoUrl')[0] || '',
        is_for_rent_only: req.flash('form_is_for_rent_only') ? req.flash('form_is_for_rent_only')[0] === 'true' : false,
        price_buy_str: req.flash('form_price_buy_str')[0] || '',
        rental_options_data: req.flash('form_rental_options_data')[0] || []
    });
};

exports.createSc = async (req, res) => {
    const { title, description, category, tags, techStack, demoUrl, is_for_rent_only, price_buy_str, rental_duration, rental_price } = req.body;
    let errors = [];
    let form_data_flash = { title, description, category, tags, techStack, demoUrl, is_for_rent_only, price_buy_str, rental_options_data: [] };

    if (!title || !description || !category) errors.push({ msg: 'Judul, Deskripsi, dan Kategori wajib diisi.' });
    if (!req.files || !req.files.sc_file || req.files.sc_file.length === 0) errors.push({ msg: 'File Source Code wajib diupload.' });

    const isRentOnly = is_for_rent_only === 'on' || is_for_rent_only === true;
    let priceBuy = null;
    if (!isRentOnly) {
        priceBuy = parseFloat(price_buy_str);
        if (price_buy_str && (isNaN(priceBuy) || priceBuy < 0)) errors.push({ msg: 'Harga jual tidak valid.' });
        else if (!price_buy_str && (!rental_duration || rental_duration.length === 0)) errors.push({msg: 'Harga jual atau opsi sewa harus diisi jika tidak hanya disewa.'})
    }

    let rentalOptions = [];
    if (rental_duration && rental_price) {
        const durations = Array.isArray(rental_duration) ? rental_duration : [rental_duration];
        const prices = Array.isArray(rental_price) ? rental_price : [rental_price];

        if (durations.length !== prices.length) {
            errors.push({msg: "Data durasi dan harga sewa tidak cocok."});
        } else {
            for (let i = 0; i < durations.length; i++) {
                if (durations[i] && prices[i]) {
                    const price = parseFloat(prices[i]);
                    if (!durations[i] || isNaN(price) || price < 0) {
                         errors.push({msg: `Opsi sewa ke-${i+1} tidak valid.`});
                         break;
                    }
                    rentalOptions.push({ duration: durations[i], price: price });
                    form_data_flash.rental_options_data.push({duration: durations[i], price: price});
                }
            }
        }
    }

    if (isRentOnly && rentalOptions.length === 0) {
        errors.push({ msg: 'Jika hanya disewa, minimal satu Opsi Sewa harus diisi.' });
    }

    if (errors.length > 0) {
        if (req.files) {
            if (req.files.sc_file) req.files.sc_file.forEach(f => { try { fs.unlinkSync(f.path); } catch(e){ console.error("Error unlinking sc_file:", e); } });
            if (req.files.screenshots) req.files.screenshots.forEach(f => { try { fs.unlinkSync(f.path); } catch(e){ console.error("Error unlinking screenshot:", e); } });
        }
        req.flash('errors', errors);
        req.flash('form_title', form_data_flash.title);
        req.flash('form_description', form_data_flash.description);
        req.flash('form_category', form_data_flash.category);
        req.flash('form_tags', form_data_flash.tags);
        req.flash('form_techStack', form_data_flash.techStack);
        req.flash('form_demoUrl', form_data_flash.demoUrl);
        req.flash('form_is_for_rent_only', form_data_flash.is_for_rent_only ? 'true' : 'false');
        req.flash('form_price_buy_str', form_data_flash.price_buy_str);
        req.flash('form_rental_options_data', form_data_flash.rental_options_data);
        return res.redirect('/sc/add');
    }

    try {
        const newSc = new SourceCode({
            title,
            description,
            category,
            tags: tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
            techStack: techStack ? techStack.split(',').map(tech => tech.trim()).filter(tech => tech) : [],
            demoUrl,
            is_for_rent_only: isRentOnly,
            price_buy: (!isRentOnly && priceBuy !== null) ? priceBuy : undefined,
            rental_options: rentalOptions,
            seller: req.user._id,
            filePath: req.files.sc_file[0].path,
            screenshots: req.files.screenshots ? req.files.screenshots.map(f => f.path) : [],
            status: req.user.role === 'admin' ? 'approved' : 'pending_approval'
        });
        await newSc.save();
        req.flash('success_msg', 'Source code berhasil ditambahkan dan menunggu approval (jika Anda bukan admin).');
        res.redirect('/dashboard');
    } catch (error) {
        console.error("Error creating SC:", error);
        if (req.files) {
            if (req.files.sc_file) req.files.sc_file.forEach(f => { try { fs.unlinkSync(f.path); } catch(e){ console.error("Error unlinking sc_file on catch:", e); } });
            if (req.files.screenshots) req.files.screenshots.forEach(f => { try { fs.unlinkSync(f.path); } catch(e){ console.error("Error unlinking screenshot on catch:", e); } });
        }
        req.flash('error_msg', `Gagal menambahkan source code: ${error.message}`);
        req.flash('form_title', form_data_flash.title);
        req.flash('form_description', form_data_flash.description);
        req.flash('form_category', form_data_flash.category);
        req.flash('form_tags', form_data_flash.tags);
        req.flash('form_techStack', form_data_flash.techStack);
        req.flash('form_demoUrl', form_data_flash.demoUrl);
        req.flash('form_is_for_rent_only', form_data_flash.is_for_rent_only ? 'true' : 'false');
        req.flash('form_price_buy_str', form_data_flash.price_buy_str);
        req.flash('form_rental_options_data', form_data_flash.rental_options_data);
        res.redirect('/sc/add');
    }
};

exports.getScDetail = async (req, res) => {
    try {
        const sc = await SourceCode.findById(req.params.id)
            .populate('seller', 'name email qrisBaseCode qrisMerchantId qrisApiKey _id')
            .populate({
                path: 'reviews',
                populate: { path: 'user', select: 'name' },
                options: { sort: { createdAt: -1 } }
            });

        let canViewSc = false;
        if (sc) {
            if (sc.status === 'approved') {
                canViewSc = true;
            } else if (req.user) {
                const sellerIdString = sc.seller && sc.seller._id ? sc.seller._id.toString() : (sc.seller ? sc.seller.toString() : null);
                if ((sellerIdString && req.user._id.toString() === sellerIdString) || req.user.role === 'admin') {
                    canViewSc = true;
                }
            }
        }

        if (!canViewSc) {
            req.flash('error_msg', 'Source code tidak ditemukan atau belum disetujui.');
            return res.redirect('/sc-list');
        }

        let existingOrder = null;
        let hasPurchasedOrRented = false;
        let hasReviewed = false;

        if (req.user) {
            existingOrder = await Order.findOne({
                user: req.user._id,
                sourceCode: sc._id,
                paymentStatus: 'completed'
            }).sort({ createdAt: -1 });

            if (existingOrder) {
                hasPurchasedOrRented = true;
            }

            const userReview = await Review.findOne({ sc: sc._id, user: req.user._id });
            if (userReview) {
                hasReviewed = true;
            }
        }

        const breadcrumbs = [
            { name: 'Semua SC', url: '/sc-list' },
            { name: sc.title, active: true }
        ];

        res.render('sc/detail', {
            titlePage: sc.title,
            sc,
            breadcrumbs,
            reviews: sc.reviews,
            existingOrder,
            hasPurchasedOrRented,
            hasReviewed,
            currentUser: req.user
        });
    } catch (error) {
        console.error("Error getScDetail:", error);
        req.flash('error_msg', 'Gagal memuat detail source code.');
        res.redirect('/sc-list');
    }
};

exports.submitReview = async (req, res) => {
    const { rating, comment } = req.body;
    const scId = req.params.id;
    const userId = req.user._id;

    if (!rating || rating < 1 || rating > 5) {
        req.flash('error_msg', 'Rating harus antara 1 dan 5.');
        return res.redirect(`/sc/${scId}`);
    }

    try {
        const sc = await SourceCode.findById(scId);
        if (!sc) {
            req.flash('error_msg', 'Source code tidak ditemukan.');
            return res.redirect('/sc-list');
        }

        const order = await Order.findOne({ user: userId, sourceCode: scId, paymentStatus: 'completed' });
        if (!order) {
            req.flash('error_msg', 'Anda harus membeli atau menyewa SC ini untuk memberi ulasan.');
            return res.redirect(`/sc/${scId}`);
        }

        const existingReview = await Review.findOne({ sc: scId, user: userId });
        if (existingReview) {
            req.flash('error_msg', 'Anda sudah memberikan ulasan untuk SC ini.');
            return res.redirect(`/sc/${scId}`);
        }

        const newReview = new Review({
            sc: scId,
            user: userId,
            rating: parseInt(rating),
            comment: comment ? comment.trim() : null
        });
        await newReview.save();

        req.flash('success_msg', 'Ulasan Anda berhasil dikirim.');
        res.redirect(`/sc/${scId}`);

    } catch (error) {
        console.error("Error submitting review:", error);
        if (error.code === 11000) {
             req.flash('error_msg', 'Anda sudah memberikan ulasan untuk SC ini (duplikat).');
        } else {
            req.flash('error_msg', `Gagal mengirim ulasan: ${error.message}`);
        }
        res.redirect(`/sc/${scId}`);
    }
};

exports.getQuickViewData = async (req, res) => {
    try {
        const sc = await SourceCode.findById(req.params.id)
            .select('title description category price_buy rental_options screenshots is_for_rent_only status'); // Tambahkan status

        if (!sc || sc.status !== 'approved') {
            return res.status(404).json({ message: 'Source code not found or not available.' });
        }

        let displayPrice;
        if (!sc.is_for_rent_only && sc.price_buy) {
            displayPrice = `Rp ${sc.price_buy.toLocaleString('id-ID')}`;
        } else if (sc.rental_options && sc.rental_options.length > 0) {
            const minRentPrice = sc.rental_options.reduce((min, p) => p.price < min ? p.price : min, sc.rental_options[0].price);
            displayPrice = `Mulai Rp ${minRentPrice.toLocaleString('id-ID')}`;
        }


        res.json({
            id: sc._id,
            title: sc.title,
            description_short: sc.description.substring(0, 150) + (sc.description.length > 150 ? '...' : ''),
            category: sc.category,
            price_display: displayPrice,
            image: (sc.screenshots && sc.screenshots.length > 0) ? `/${sc.screenshots[0].replace(/\\/g, '/')}` : 'https://via.placeholder.com/300x200.png?text=No+Image'
        });
    } catch (error) {
        console.error("Quick view data error:", error);
        res.status(500).json({ message: 'Error fetching quick view data.' });
    }
};