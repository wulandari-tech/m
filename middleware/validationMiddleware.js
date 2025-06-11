const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');

exports.loginValidation = [
    body('email').isEmail().withMessage('Format email tidak valid').normalizeEmail(),
    body('password').notEmpty().withMessage('Password tidak boleh kosong')
];

exports.registerValidation = [
    body('name').notEmpty().withMessage('Nama tidak boleh kosong').trim().escape(),
    body('email').isEmail().withMessage('Format email tidak valid').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password minimal 6 karakter'),
    body('confirm_password').custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error('Konfirmasi password tidak cocok');
        }
        return true;
    }),
    body('role').isIn(['customer', 'seller']).withMessage('Role tidak valid')
];

exports.profileUpdateValidation = [
    body('name').notEmpty().withMessage('Nama tidak boleh kosong').trim().escape(),
    body('storeName').optional({ checkFalsy: true }).trim().escape(),
    body('bio').optional({ checkFalsy: true }).isLength({ max: 250 }).withMessage('Bio maksimal 250 karakter').trim().escape(),
    body('location').optional({ checkFalsy: true }).trim().escape(),
    body('website').optional({ checkFalsy: true }).isURL().withMessage('URL Website tidak valid').trim()
];

exports.passwordChangeValidation = [
    body('current_password').notEmpty().withMessage('Password saat ini tidak boleh kosong'),
    body('new_password').isLength({ min: 6 }).withMessage('Password baru minimal 6 karakter'),
    body('confirm_new_password').custom((value, { req }) => {
        if (value !== req.body.new_password) {
            throw new Error('Konfirmasi password baru tidak cocok');
        }
        return true;
    })
];

exports.qrisSettingsValidation = [
    body('qrisBaseCode').optional({ checkFalsy: true }).trim(),
    body('qrisMerchantId').optional({ checkFalsy: true }).trim().escape(),
    body('qrisApiKey').optional({ checkFalsy: true }).trim()
];

exports.apiSettingsValidation = [
    body('pterodactylPanelUrl').notEmpty().withMessage('URL Panel Pterodactyl wajib diisi.').isURL().withMessage('URL Panel Pterodactyl tidak valid').trim(),
    body('pterodactylAppApiKey').notEmpty().withMessage('API Key Aplikasi Pterodactyl wajib diisi.').trim(),
    body('pterodactylDefaultLocationId').notEmpty().withMessage('Location ID Default wajib diisi.').isInt({ min: 1 }).withMessage('Location ID Default tidak valid (angka > 0).'),
    body('pterodactylDefaultNestId').notEmpty().withMessage('Nest ID Default wajib diisi.').isInt({ min: 1 }).withMessage('Nest ID Default tidak valid (angka > 0).'),
    body('pterodactylDefaultEggId').notEmpty().withMessage('Egg ID Default wajib diisi.').isInt({ min: 1 }).withMessage('Egg ID Default tidak valid (angka > 0).'),
    body('pterodactylClientApiKey').optional({ checkFalsy: true }).trim()
];

exports.addScValidation = [
    body('title').notEmpty().withMessage('Judul tidak boleh kosong').trim().isLength({ min: 5 }).withMessage('Judul minimal 5 karakter'),
    body('productType').notEmpty().withMessage('Tipe produk harus dipilih').isIn(['source_code', 'panel_service']),
    body('description').notEmpty().withMessage('Deskripsi tidak boleh kosong').trim().isLength({ min: 20 }).withMessage('Deskripsi minimal 20 karakter'),
    body('category').notEmpty().withMessage('Kategori harus dipilih'),
    
    body('tags').if(body('productType').equals('source_code')).optional({ checkFalsy: true }).trim().escape(),
    body('techStack').if(body('productType').equals('source_code')).optional({ checkFalsy: true }).trim().escape(),
    body('demoUrl').if(body('productType').equals('source_code')).optional({ checkFalsy: true }).isURL().withMessage('URL Demo tidak valid').trim(),
    body('is_for_rent_only').if(body('productType').equals('source_code')).isBoolean().optional(),
    body('price_buy_str').if(body('productType').equals('source_code')).optional({ checkFalsy: true }).isNumeric({no_symbols: true}).withMessage('Harga jual harus angka positif.').toFloat(),
    body('rental_duration.*').if(body('productType').equals('source_code')).optional().notEmpty().withMessage('Durasi sewa harus dipilih'),
    body('rental_price.*').if(body('productType').equals('source_code')).optional().isNumeric({no_symbols: true}).withMessage('Harga sewa harus angka positif.').toFloat(),

    body('panelRamMB').if(body('productType').equals('panel_service')).notEmpty().withMessage('RAM Panel wajib diisi.').isInt({ min: 0 }).withMessage('RAM Panel tidak valid (angka >= 0).'),
    body('panelDiskMB').if(body('productType').equals('panel_service')).notEmpty().withMessage('Disk Panel wajib diisi.').isInt({ min: 0 }).withMessage('Disk Panel tidak valid (angka >= 0).'),
    body('panelCpuPercentage').if(body('productType').equals('panel_service')).notEmpty().withMessage('CPU Panel wajib diisi.').isInt({ min: 0 }).withMessage('CPU Panel tidak valid (angka >= 0).'),
    body('panel_price').if(body('productType').equals('panel_service')).notEmpty().withMessage('Harga layanan panel wajib diisi.').isFloat({ min: 0, max: 100000 }).withMessage('Harga panel antara 0 - 100.000.')
];

exports.reviewValidation = [
    body('rating').notEmpty().withMessage('Rating harus diisi').isInt({ min: 1, max: 5 }).withMessage('Rating antara 1 dan 5'),
    body('comment').optional({ checkFalsy: true }).trim().escape().isLength({ max: 1000 }).withMessage('Komentar maksimal 1000 karakter')
];

exports.depositValidation = [
    body('amount').notEmpty().withMessage('Jumlah deposit tidak boleh kosong').isInt({ min: 1 }).withMessage('Minimal deposit Rp 1.'),
    body('payment_method').isIn(['midtrans', 'qris_orkut']).withMessage('Metode pembayaran tidak valid')
];

exports.orderValidation = [
    body('scId').notEmpty().withMessage('ID Produk diperlukan').isMongoId().withMessage('ID Produk tidak valid'),
    body('orderType').isIn(['buy', 'rent']).withMessage('Tipe order tidak valid'),
    body('payment_method').isIn(['saldo', 'midtrans', 'qris_orkut']).withMessage('Metode pembayaran tidak valid'),
    body('rentalOptionIndex').if(body('orderType').equals('rent')).notEmpty().withMessage('Opsi sewa harus dipilih').isInt({ min: 0 }),
    body('panelUsername').if(body('productTypeFromSc').equals('panel_service')).optional({checkFalsy:true}).isLength({min:3, max:30}).withMessage('Username panel antara 3-30 karakter').matches(/^[a-zA-Z0-9_]+$/).withMessage('Username panel hanya boleh huruf, angka, dan underscore.')
];

exports.ticketValidation = [
    body('subject').notEmpty().withMessage('Subjek tiket tidak boleh kosong').trim().isLength({ min: 5, max: 100 }).withMessage('Subjek antara 5 dan 100 karakter'),
    body('message').notEmpty().withMessage('Pesan tidak boleh kosong').trim().isLength({ min: 10, max: 2000 }).withMessage('Pesan antara 10 dan 2000 karakter'),
    body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Prioritas tidak valid'),
    body('scId').optional({checkFalsy: true}).isMongoId().withMessage('ID Produk tidak valid'),
    body('orderId').optional({checkFalsy: true}).isMongoId().withMessage('ID Pesanan tidak valid'),
    body('receiverId').optional({checkFalsy: true}).isMongoId().withMessage('ID Penerima tidak valid'),
];

exports.ticketReplyValidation = [
    body('message').notEmpty().withMessage('Pesan balasan tidak boleh kosong').trim().isLength({ min: 1, max: 2000 }).withMessage('Pesan antara 1 dan 2000 karakter'),
];

exports.adminTicketStatusValidation = [
    body('status').isIn(['open', 'pending_reply', 'resolved', 'closed']).withMessage('Status tiket tidak valid'),
    body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Prioritas tidak valid'),
];

exports.adminTicketAssignValidation = [
    body('assignToUserId').notEmpty().withMessage('User ID untuk assignment harus ada').custom(value => {
        if (value === 'unassign' || mongoose.Types.ObjectId.isValid(value)) {
            return true;
        }
        throw new Error('User ID assignment tidak valid');
    }),
];

exports.handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => err.msg);
        req.flash('error_msg', errorMessages.join('<br>'));
        
        const formInput = { ...req.body };
        if (req.file) formInput.uploadedFile = req.file.filename; 
        if (req.files && req.files.sc_file && req.files.sc_file[0]) formInput.uploadedScFile = req.files.sc_file[0].filename;
        if (req.files && req.files.screenshots) formInput.uploadedScreenshots = req.files.screenshots.map(f => f.filename);
        
        req.flash('formInput', formInput);

        let redirectPath = req.header('Referer') || '/';
        
        if (req.path.includes('/auth/register')) redirectPath = '/register';
        else if (req.path.includes('/auth/login')) redirectPath = '/login';
        else if (req.path.includes('/profile/update') || req.path.includes('/profile/change-password')) redirectPath = '/dashboard/profile';
        else if (req.path.includes('/profile/qris-settings')) redirectPath = '/dashboard/profile#qris-settings';
        else if (req.path.includes('/profile/api-settings')) redirectPath = '/dashboard/profile#api-settings';
        else if (req.path.includes('/sc') && (req.method === 'POST' || req.method === 'PUT') && !req.path.includes('reviews')) {
             redirectPath = req.path.includes('/edit/') ? `/sc/edit/${req.params.id}` : '/sc/add';
        }
        else if (req.path.includes('/reviews')) redirectPath = `/sc/${req.params.id}#nav-reviews`;
        else if (req.path.includes('/balance/deposit')) redirectPath = '/dashboard/deposit';
        else if (req.path.includes('/orders')) redirectPath = req.body.scId ? `/sc/${req.body.scId}` : '/sc-list';
        else if (req.path.includes('/tickets') && req.method === 'POST' && !req.path.includes('reply') && !req.path.includes('status') && !req.path.includes('assign')) {
            redirectPath = '/api/tickets/new';
        }
        return res.redirect(redirectPath);
    }
    next();
};