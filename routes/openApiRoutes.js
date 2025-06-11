const express = require('express');
const router = express.Router();
const SourceCode = require('../models/sourceCode');
const User = require('../models/user');

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
        
        let query = { status: 'approved' };
        if (category) query.category = category;
        if (type) query.productType = type;

        let sort = {};
        if (sort_by === 'price') sort.price_buy = sort_order === 'asc' ? 1 : -1;
        else if (sort_by === 'rating') sort.averageRating = sort_order === 'asc' ? 1 : -1;
        else sort.createdAt = sort_order === 'asc' ? 1 : -1;


        const products = await SourceCode.find(query)
            .populate('seller', 'storeName name')
            .select('-filePath -reviews -status -__v')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit));
        
        const totalProducts = await SourceCode.countDocuments(query);

        res.json({
            success: true,
            message: 'Daftar produk berhasil diambil.',
            data: products,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalProducts / parseInt(limit)),
                totalProducts: totalProducts,
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        console.error("API Error - Get Products:", error);
        res.status(500).json({ success: false, message: 'Gagal mengambil daftar produk.', error: error.message });
    }
});

router.get('/api/v1/products/:id', async (req, res) => {
    try {
        const product = await SourceCode.findOne({ _id: req.params.id, status: 'approved' })
            .populate('seller', 'storeName name profilePicture')
            .select('-filePath -status -__v'); 
            
        if (!product) {
            return res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });
        }
        res.json({ success: true, data: product });
    } catch (error) {
        console.error("API Error - Get Product by ID:", error);
         if (error.kind === 'ObjectId') {
            return res.status(400).json({ success: false, message: 'ID Produk tidak valid.' });
        }
        res.status(500).json({ success: false, message: 'Gagal mengambil detail produk.', error: error.message });
    }
});

module.exports = router;