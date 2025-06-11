const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sourceCode: { type: mongoose.Schema.Types.ObjectId, ref: 'SourceCode' },
    scTitleAtPurchase: { type: String, required: true },
    sourceCodeDetails: {
        productType: { type: String, enum: ['source_code', 'panel_service'], required: true },
        seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        filePath: String,
        panelRamMB: Number,
        panelDiskMB: Number,
        panelCpuPercentage: Number
    },
    orderType: { type: String, enum: ['buy', 'rent'], required: true },
    rentalOption: {
        duration: String,
        price: Number
    },
    rentalEndDate: { type: Date },
    amount: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: ['saldo', 'midtrans', 'qris_orkut', 'free'], required: true },
    paymentStatus: { type: String, enum: ['pending', 'completed', 'failed', 'cancelled', 'expired'], default: 'pending' },
    midtransOrderId: { type: String, index: true },
    qrisData: {
        qrImageUrl: String,
        qrString: String,
        transactionId: String,
        sellerQrisUsed: Boolean
    },
    downloadLink: { type: String },
    panelUsernameChoice: { type: String }, // Untuk menyimpan pilihan username panel dari user
    panelDetails: { // Detail panel setelah berhasil di-provision
        panelUrl: String,
        username: String,
        password: String, // Pertimbangkan untuk tidak menyimpan plain text password di DB dalam jangka panjang
        serverId: String, // ID Server Pterodactyl
        serverUuid: String // UUID Server Pterodactyl
    },
    deliveryStatus: { // Status pengiriman/provisioning, terutama untuk panel
        type: String,
        enum: ['not_applicable', 'pending_payment', 'pending_provisioning', 'delivered', 'provisioning_failed'],
        default: 'not_applicable'
    },
    notes: String, // Catatan tambahan, misal pesan error provisioning
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

orderSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    if (this.sourceCodeDetails && this.sourceCodeDetails.productType === 'panel_service') {
        this.orderType = 'buy'; // Layanan panel selalu 'buy' untuk saat ini
        this.rentalOption = undefined;
        this.rentalEndDate = undefined;
    }
    if (this.paymentMethod === 'free' && this.amount === 0) {
        this.paymentStatus = 'completed'; // Jika gratis, langsung completed
        if (this.sourceCodeDetails && this.sourceCodeDetails.productType === 'source_code') {
            this.deliveryStatus = 'delivered'; // Untuk SC gratis, anggap langsung terkirim
        } else if (this.sourceCodeDetails && this.sourceCodeDetails.productType === 'panel_service') {
            this.deliveryStatus = 'pending_provisioning'; // Untuk panel gratis, perlu provisioning
        }
    }
    next();
});

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);