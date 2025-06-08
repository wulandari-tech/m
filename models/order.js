const mongoose = require('mongoose');
const orderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sourceCode: { type: mongoose.Schema.Types.ObjectId, ref: 'SourceCode' }, 
    scTitleAtPurchase: { type: String }, 
    orderType: { type: String, enum: ['buy', 'rent'], required: true },
    rentalOption: { 
        duration: String,
        price: Number
    },
    rentalEndDate: { type: Date }, 
    amount: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: ['saldo', 'midtrans', 'qris_orkut'], required: true },
    paymentStatus: { type: String, enum: ['pending', 'completed', 'failed', 'cancelled', 'expired'], default: 'pending' },
    midtransOrderId: { type: String }, 
    qrisData: { 
        qrImageUrl: String,
        qrString: String,
        transactionId: String, 
        sellerQrisUsed: Boolean 
    },
    downloadLink: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

orderSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Order', orderSchema);