const mongoose = require('mongoose');
const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  type: { 
    type: String,
    required: true,
    enum: ['deposit', 'purchase_sc', 'rent_sc', 'withdrawal', 'refund']
  },
  amount: {
    type: Number,
    required: true
  },
  description: { 
    type: String,
    required: true
  },
  midtransOrderId: { 
    type: String,
    index: true 
  },
  midtransTransactionId: { 
    type: String,
    index: true
  },
  paymentMethod: { 
    type: String,
    required: true
  },
  status: { 
    type: String,
    required: true,
    default: 'pending'
  },
  sourceCode: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SourceCode'
  },
  relatedOrder: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  metadata: { 
    type: Object
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

transactionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Transaction = mongoose.model('Transaction', transactionSchema);
module.exports = Transaction;