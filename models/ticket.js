const mongoose = require('mongoose');
const messageSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
const ticketSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, required: true, trim: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' }, 
    sc: { type: mongoose.Schema.Types.ObjectId, ref: 'SourceCode' },
    status: { type: String, enum: ['open', 'pending_reply', 'resolved', 'closed'], default: 'open' },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    messages: [messageSchema],
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
ticketSchema.pre('save', function(next) { this.updatedAt = Date.now(); next(); });
module.exports = mongoose.model('Ticket', ticketSchema);