const Order = require('../models/order');
const SourceCode = require('../models/sourceCode');
const User = require('../models/user'); 
const mongoose = require('mongoose');

exports.getSellerAnalyticsPage = async (req, res) => {
    try {
        res.render('seller/analytics', {
            titlePage: 'Analitik Penjualan',
            breadcrumbs: [
                { name: 'Dashboard', url: '/dashboard' },
                { name: 'Analitik Penjualan', active: true }
            ]
        });
    } catch (error) {
        console.error("Error rendering seller analytics page:", error);
        req.flash('error_msg', 'Gagal memuat halaman analitik.');
        res.redirect('/dashboard');
    }
};

exports.getSellerAnalyticsData = async (req, res) => {
    const sellerId = req.user._id;
    const { period = 'last30days', scId } = req.query; // period: 'today', 'last7days', 'last30days', 'alltime'

    let startDate;
    const endDate = new Date(); // Today, end of day
    endDate.setHours(23, 59, 59, 999);


    switch (period) {
        case 'today':
            startDate = new Date();
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'last7days':
            startDate = new Date();
            startDate.setDate(endDate.getDate() - 7);
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'last30days':
        default: // Default to last 30 days
            startDate = new Date();
            startDate.setDate(endDate.getDate() - 30);
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'alltime':
            startDate = new Date(0); // Epoch time
            break;
    }

    try {
        const matchConditions = {
            paymentStatus: 'completed',
            'sourceCodeDetails.seller': new mongoose.Types.ObjectId(sellerId), 
            createdAt: { $gte: startDate, $lte: endDate }
        };

        if (scId && mongoose.Types.ObjectId.isValid(scId)) {
            matchConditions.sourceCode = new mongoose.Types.ObjectId(scId);
        }
        
        const salesData = await Order.aggregate([
            {
                $lookup: {
                    from: 'sourcecodes',
                    localField: 'sourceCode',
                    foreignField: '_id',
                    as: 'sourceCodeDetails'
                }
            },
            { $unwind: '$sourceCodeDetails' },
            { $match: matchConditions },
            {
                $group: {
                    _id: null,
                    totalSalesAmount: { $sum: '$amount' },
                    totalOrders: { $sum: 1 },
                    uniqueBuyers: { $addToSet: '$user' }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalSalesAmount: 1,
                    totalOrders: 1,
                    totalUniqueBuyers: { $size: '$uniqueBuyers' }
                }
            }
        ]);
        
        const topSellingSc = await Order.aggregate([
            {
                $lookup: { from: 'sourcecodes', localField: 'sourceCode', foreignField: '_id', as: 'sourceCodeDetails' }
            },
            { $unwind: '$sourceCodeDetails' },
            { 
                $match: { 
                    'sourceCodeDetails.seller': new mongoose.Types.ObjectId(sellerId),
                    paymentStatus: 'completed',
                    createdAt: { $gte: startDate, $lte: endDate }
                } 
            },
            {
                $group: {
                    _id: '$sourceCode',
                    title: { $first: '$sourceCodeDetails.title' },
                    totalSold: { $sum: 1 },
                    totalRevenue: { $sum: '$amount' }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 5 }
        ]);

        const dailySales = await Order.aggregate([
             {
                $lookup: { from: 'sourcecodes', localField: 'sourceCode', foreignField: '_id', as: 'sourceCodeDetails' }
            },
            { $unwind: '$sourceCodeDetails' },
            {
                $match: {
                    'sourceCodeDetails.seller': new mongoose.Types.ObjectId(sellerId),
                    paymentStatus: 'completed',
                    createdAt: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    dailyRevenue: { $sum: "$amount" },
                    dailyOrders: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } } 
        ]);


        const analytics = {
            summary: salesData.length > 0 ? salesData[0] : { totalSalesAmount: 0, totalOrders: 0, totalUniqueBuyers: 0 },
            topSellingSc: topSellingSc,
            dailySales: dailySales,
            period: period,
            startDate: startDate.toLocaleDateString('id-ID'),
            endDate: endDate.toLocaleDateString('id-ID')
        };

        res.json(analytics);

    } catch (error) {
        console.error("Error fetching seller analytics data:", error);
        res.status(500).json({ message: 'Gagal mengambil data analitik.', error: error.message });
    }
};