const express = require('express');
const router = express.Router();
const SourceCode = require('../models/sourceCode');
const User = require('../models/user');
const Transaction = require('../models/transaction');
const balanceController = require('../controllers/balanceController');
const apiKeyAuth = require('../middleware/apiKeyAuthMiddleware');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');


router.get('/api-docs', (req, res) => {
    res.render('pages/api_docs', {
        titlePage: 'Dokumentasi API',
        breadcrumbs: [{ name: 'Dokumentasi API', active: true }]
    });
});

router.get('/api/v1/products', async (req, res) => {
    try {
        const { limit = 10, page = 1, category, type, sort_by, sort_order = 'desc' } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        let query = { status: 'approved', isPublic: true };
        if (category) query.category = category;
        if (type) query.productType = type;
        let sort = {};
        if (sort_by === 'price') sort.price_buy = sort_order === 'asc' ? 1 : -1;
        else if (sort_by === 'rating') sort.averageRating = sort_order === 'asc' ? 1 : -1;
        else sort.createdAt = sort_order === 'asc' ? 1 : -1;

        const products = await SourceCode.find(query)
            .populate('seller', 'storeName name')
            .select('-filePath -reviews -status -__v -rental_options -techStack -tags -panelRamMB -panelDiskMB -panelCpuPercentage -panelMaxDatabases -panelMaxAllocations -panelMaxBackups -isPublic -is_for_rent_only -demoUrl -qrisData')
            .sort(sort).skip(skip).limit(parseInt(limit));
        const totalProducts = await SourceCode.countDocuments(query);
        res.json({
            success: true, message: 'Daftar produk berhasil diambil.', data: products,
            pagination: { currentPage: parseInt(page), totalPages: Math.ceil(totalProducts / parseInt(limit)), totalProducts: totalProducts, limit: parseInt(limit)}
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Gagal mengambil daftar produk.', error: error.message });
    }
});

router.get('/api/v1/products/:id', async (req, res) => {
    try {
        const product = await SourceCode.findOne({ _id: req.params.id, status: 'approved', isPublic: true })
            .populate('seller', 'storeName name profilePicture')
            .select('-filePath -status -__v -reviews -isPublic');
        if (!product) { return res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' }); }
        res.json({ success: true, data: product });
    } catch (error) {
         if (error.kind === 'ObjectId' || error.name === 'CastError') { return res.status(400).json({ success: false, message: 'ID Produk tidak valid.' }); }
        res.status(500).json({ success: false, message: 'Gagal mengambil detail produk.', error: error.message });
    }
});

router.post('/api/v1/deposit',
    apiKeyAuth,
    [
        body('amount').notEmpty().withMessage('Jumlah deposit tidak boleh kosong').isInt({ min: 1 }).withMessage('Minimal deposit Rp 1.'),
        body('payment_method').isIn(['midtrans', 'qris_orkut']).withMessage('Metode pembayaran tidak valid (midtrans atau qris_orkut).')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }
        try {
            const { amount, payment_method } = req.body;
            const user = req.apiUser;

            const depositResult = await balanceController.createDepositViaApi(user, parseInt(amount), payment_method, req);
            
            if (depositResult.success) {
                res.status(201).json({
                    success: true,
                    message: 'Permintaan deposit berhasil dibuat.',
                    transactionId: depositResult.transactionId,
                    paymentDetails: depositResult.paymentDetails
                });
            } else {
                res.status(400).json({ success: false, message: depositResult.message || 'Gagal memproses permintaan deposit.' });
            }
        } catch (error) {
            res.status(500).json({ success: false, message: 'Kesalahan server saat memproses deposit.', error: error.message });
        }
    }
);

router.get('/api/v1/transactions', apiKeyAuth, async (req, res) => {
    try {
        const { limit = 10, page = 1, type } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        let query = { user: req.apiUser._id };
        if (type) query.type = type;

        const transactions = await Transaction.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .select('-user -__v -order');

        const totalTransactions = await Transaction.countDocuments(query);
        res.json({
            success: true,
            message: 'Daftar transaksi berhasil diambil.',
            data: transactions,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalTransactions / parseInt(limit)),
                totalTransactions: totalTransactions,
                limit: parseInt(limit)
            }
        });
    } catch (error) {
         res.status(500).json({ success: false, message: 'Gagal mengambil daftar transaksi.', error: error.message });
    }
});

router.get('/api/v1/balance', apiKeyAuth, (req, res) => {
    if (!req.apiUser) { // Double check, meskipun apiKeyAuth seharusnya sudah menangani
        return res.status(401).json({ success: false, message: "Otentikasi API Key gagal atau tidak ada."})
    }
    res.json({
        success: true,
        message: 'Saldo berhasil diambil.',
        data: {
            balance: req.apiUser.balance,
            currency: 'IDR'
        }
    });
});

router.post('/api/v1/withdraw', apiKeyAuth, (req, res) => {
    res.status(501).json({ success: false, message: 'Fitur penarikan dana (withdraw) segera hadir.'});
});

module.exports = router;
