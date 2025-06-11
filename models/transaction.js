const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
        type: String,
        required: true,
        enum: [
            'deposit',
            'purchase_sc',
            'rent_sc',
            'withdrawal',
            'refund',
            'seller_payout',
            'purchase_panel' // <-- Tambahkan ini
        ]
    },
    amount: { type: Number, required: true },
    description: { type: String, required: true },
    status: {
        type: String,
        required: true,
        enum: ['pending', 'success', 'failed', 'cancelled', 'expired', 'refunded', 'completed'], // 'completed' bisa jadi alias 'success'
        default: 'pending'
    },
    paymentMethod: { type: String },
    midtransOrderId: { type: String, index: true }, // ID dari Midtrans atau sistem pembayaran lain, atau ID unik internal
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' }, // Jika transaksi terkait order
    sourceCode: { type: mongoose.Schema.Types.ObjectId, ref: 'SourceCode' }, // Jika terkait SC spesifik
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);