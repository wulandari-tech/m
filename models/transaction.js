const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['deposit', 'purchase_sc', 'rent_sc', 'withdrawal', 'refund', 'seller_payout'], required: true },
    amount: { type: Number, required: true }, // Positive for deposit/income, negative for expense
    description: { type: String, required: true },
    status: { type: String, enum: ['pending', 'success', 'failed', 'cancelled', 'expired'], default: 'pending' },
    paymentMethod: { type: String }, 
    midtransOrderId: { type: String }, 
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' }, 
    sourceCode: { type: mongoose.Schema.Types.ObjectId, ref: 'SourceCode' }, 
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

transactionSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Transaction', transactionSchema);