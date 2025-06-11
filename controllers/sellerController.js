const Order = require('../models/order');
const SourceCode = require('../models/sourceCode');
const User = require('../models/user');
const mongoose = require('mongoose');
const crypto = require('crypto');
const axios = require('axios');

exports.getAnalyticsPage = async (req, res) => {
    try {
        if (!res.locals.currentUser || (res.locals.currentUser.role !== 'seller' && res.locals.currentUser.role !== 'admin')) {
            req.flash('error_msg', 'Akses ditolak.');
            return res.redirect('/dashboard');
        }
        const sellerSourceCodes = await SourceCode.find({ seller: req.user.id, status: 'approved' })
            .select('title _id productType')
            .sort({ title: 1 });
        res.render('seller/analytics', {
            titlePage: 'Analitik Penjualan',
            sellerSourceCodes,
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
    const sellerId = req.user.id;
    const { period = 'last30days', scId } = req.query;
    let startDate;
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    switch (period) {
        case 'today':
            startDate = new Date();
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'last7days':
            startDate = new Date();
            startDate.setDate(endDate.getDate() - 6);
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'alltime':
            startDate = new Date(0);
            break;
        case 'last30days':
        default:
            startDate = new Date();
            startDate.setDate(endDate.getDate() - 29);
            startDate.setHours(0, 0, 0, 0);
            break;
    }
    try {
        const matchConditionsForAggregation = {
            'sourceCodeDetails.seller': new mongoose.Types.ObjectId(sellerId),
            paymentStatus: 'completed',
            createdAt: { $gte: startDate, $lte: endDate }
        };
        if (scId && mongoose.Types.ObjectId.isValid(scId)) {
            matchConditionsForAggregation.sourceCode = new mongoose.Types.ObjectId(scId);
        }
        const salesDataAggregation = await Order.aggregate([
            { $lookup: { from: 'sourcecodes', localField: 'sourceCode', foreignField: '_id', as: 'sourceCodeDetails' } },
            { $unwind: '$sourceCodeDetails' },
            { $match: matchConditionsForAggregation },
            { $group: { _id: null, totalSalesAmount: { $sum: '$amount' }, totalOrders: { $sum: 1 }, uniqueBuyersSet: { $addToSet: '$user' } } },
            { $project: { _id: 0, totalSalesAmount: 1, totalOrders: 1, totalUniqueBuyers: { $size: '$uniqueBuyersSet' } } }
        ]);
        const topSellingSc = await Order.aggregate([
            { $lookup: { from: 'sourcecodes', localField: 'sourceCode', foreignField: '_id', as: 'sourceCodeDetails' } },
            { $unwind: '$sourceCodeDetails' },
            { $match: matchConditionsForAggregation },
            { $group: { _id: '$sourceCode', title: { $first: '$sourceCodeDetails.title' }, totalSold: { $sum: 1 }, totalRevenue: { $sum: '$amount' } } },
            { $sort: { totalSold: -1 } },
            { $limit: 5 }
        ]);
        const dailySales = await Order.aggregate([
             { $lookup: { from: 'sourcecodes', localField: 'sourceCode', foreignField: '_id', as: 'sourceCodeDetails' } },
            { $unwind: '$sourceCodeDetails' },
            { $match: matchConditionsForAggregation },
            { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, dailyRevenue: { $sum: "$amount" }, dailyOrders: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);
        const analytics = {
            summary: salesDataAggregation.length > 0 ? salesDataAggregation[0] : { totalSalesAmount: 0, totalOrders: 0, totalUniqueBuyers: 0 },
            topSellingSc: topSellingSc,
            dailySales: dailySales,
            period: period,
            startDate: startDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
            endDate: endDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
        };
        res.json(analytics);
    } catch (error) {
        console.error("Error fetching seller analytics data:", error);
        res.status(500).json({ message: 'Gagal mengambil data analitik.', error: error.message });
    }
};

exports.provisionPterodactylServer = async (order, panelUsername, panelPasswordGenerated) => {
    try {
        if (!order || !order.sourceCodeDetails || !order.sourceCodeDetails.seller) {
            console.error("provisionPterodactylServer: Order data incomplete. Order ID:", order ? order._id : 'N/A');
            return { success: false, message: "Data order tidak lengkap untuk provisioning panel." };
        }
        const seller = await User.findById(order.sourceCodeDetails.seller);
        const panelProduct = await SourceCode.findById(order.sourceCode);

        if (!seller || !panelProduct || panelProduct.productType !== 'panel_service') {
            console.error("Invalid data for panel provisioning. Order ID:", order._id);
            return { success: false, message: "Data produk panel atau seller tidak valid." };
        }

        const { pterodactylPanelUrl, pterodactylAppApiKey, pterodactylDefaultNestId, pterodactylDefaultEggId, pterodactylDefaultLocationId } = seller;

        if (!pterodactylPanelUrl || !pterodactylAppApiKey || !pterodactylDefaultNestId || !pterodactylDefaultEggId || !pterodactylDefaultLocationId) {
            console.error("Konfigurasi Pterodactyl seller tidak lengkap. Seller ID:", seller._id);
            return { success: false, message: "Konfigurasi Pterodactyl seller belum lengkap. Harap seller melengkapi di profil." };
        }
        
        const domain = pterodactylPanelUrl.replace(/\/$/, "");
        const apikey = pterodactylAppApiKey;
        const nestid = pterodactylDefaultNestId;
        const eggid = pterodactylDefaultEggId;
        const locid = pterodactylDefaultLocationId;

        const username = panelUsername.toLowerCase();
        const email = `${username}@${(seller.storeName || 'paneluser').replace(/\s+/g, '').toLowerCase()}.com`;
        const firstName = username.charAt(0).toUpperCase() + username.slice(1);
        const password = panelPasswordGenerated;

        const pteroApi = axios.create({
            baseURL: domain,
            headers: {
                'Authorization': `Bearer ${apikey}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });

        let userDataAttributes;
        try {
            const userCreateResponse = await pteroApi.post('/api/application/users', {
                email: email, username: username, first_name: firstName, last_name: "User", language: "en", password: password
            });
            userDataAttributes = userCreateResponse.data.attributes;
        } catch (userError) {
            if (userError.response && userError.response.data && userError.response.data.errors) {
                const isUniqueError = userError.response.data.errors.some(e => e.code === 'UnprocessableEntityException' && (e.detail.includes('email field has already been taken') || e.detail.includes('username field has already been taken')));
                if (isUniqueError) {
                    try {
                        const usersListRes = await pteroApi.get(`/api/application/users?filter[email]=${encodeURIComponent(email)}&filter[username]=${encodeURIComponent(username)}`);
                        if (usersListRes.data && usersListRes.data.data && usersListRes.data.data.length > 0) {
                            userDataAttributes = usersListRes.data.data[0].attributes;
                        } else {
                            console.error("Pterodactyl User Creation Error (Unique, not found):", userError.response.data.errors[0]);
                            return { success: false, message: `Gagal membuat/menemukan user panel (unik): ${userError.response.data.errors[0].detail}` };
                        }
                    } catch (findError) {
                         console.error("Pterodactyl Find User Error:", findError.response ? JSON.stringify(findError.response.data) : findError.message);
                         return { success: false, message: `Gagal memverifikasi user panel yang sudah ada.` };
                    }
                } else {
                    console.error("Pterodactyl User Creation Error:", userError.response.data.errors[0]);
                    return { success: false, message: `Gagal membuat user panel: ${userError.response.data.errors[0].detail}` };
                }
            } else {
                console.error("Pterodactyl User Creation Network/Unknown Error:", userError.message);
                return { success: false, message: `Gagal membuat user panel: ${userError.message}` };
            }
        }
        
        const pteroUserId = userDataAttributes.id;

        let eggDetails;
        try {
            const eggDetailsResponse = await pteroApi.get(`/api/application/nests/${nestid}/eggs/${eggid}?include=variables`);
            eggDetails = eggDetailsResponse.data.attributes;
        } catch(eggError){
            console.error("Pterodactyl Get Egg Error:", eggError.response ? JSON.stringify(eggError.response.data) : eggError.message);
            return { success: false, message: "Gagal mendapatkan detail egg Pterodactyl." };
        }

        const startupCmd = eggDetails.startup;
        const defaultDockerImage = eggDetails.docker_image;
        const defaultEnv = eggDetails.relationships && eggDetails.relationships.variables && eggDetails.relationships.variables.data
            ? eggDetails.relationships.variables.data.reduce((obj, item) => {
                 obj[item.attributes.env_variable] = item.attributes.default_value;
                 return obj;
            }, {})
            : {};

        const serverName = `${firstName}'s Server (${panelProduct.panelRamMB === 0 ? 'Unli' : panelProduct.panelRamMB / 1024}GB)`;
        const serverDescription = `Layanan panel dibeli pada ${new Date().toLocaleDateString('id-ID')} - Order ID: ${order.midtransOrderId || order._id}`;

        const serverPayload = {
            name: serverName, description: serverDescription, user: pteroUserId, egg: parseInt(eggid),
            docker_image: defaultDockerImage, startup: startupCmd, environment: defaultEnv,
            limits: { memory: panelProduct.panelRamMB, swap: 0, disk: panelProduct.panelDiskMB, io: 500, cpu: panelProduct.panelCpuPercentage },
            feature_limits: { databases: panelProduct.panelMaxDatabases || 1, allocations: panelProduct.panelMaxAllocations || 1, backups: panelProduct.panelMaxBackups || 1 },
            deploy: { locations: [parseInt(locid)], dedicated_ip: false, port_range: [] },
            start_on_completion: true
        };
        
        let serverResultData;
        try {
            const serverCreateResponse = await pteroApi.post('/api/application/servers', serverPayload);
            serverResultData = serverCreateResponse.data;
        } catch (serverError) {
             console.error("Pterodactyl Server Creation Error:", serverError.response ? JSON.stringify(serverError.response.data) : serverError.message);
             const errorDetail = serverError.response && serverError.response.data && serverError.response.data.errors && serverError.response.data.errors[0]
                               ? serverError.response.data.errors[0].detail
                               : serverError.message;
             return { success: false, message: `Gagal membuat server panel: ${errorDetail}` };
        }
        
        if (serverResultData.errors) {
            console.error("Pterodactyl Server Creation Logical Error:", JSON.stringify(serverResultData.errors[0], null, 2));
            return { success: false, message: `Gagal membuat server panel: ${serverResultData.errors[0].detail}` };
        }
        
        const pteroServer = serverResultData.attributes;

        return {
            success: true, message: "Server panel berhasil dibuat.", panelUrl: domain,
            username: userDataAttributes.username, password: password,
            serverDetails: { id: pteroServer.id, uuid: pteroServer.uuid, name: pteroServer.name }
        };

    } catch (error) {
        console.error("Error in provisionPterodactylServer (Outer Catch):", error.message);
        return { success: false, message: `Terjadi kesalahan sistem saat membuat server panel: ${error.message}` };
    }
};