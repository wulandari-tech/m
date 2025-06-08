const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    sc: { type: mongoose.Schema.Types.ObjectId, ref: 'SourceCode', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, trim: true, maxlength: 1000 },
    createdAt: { type: Date, default: Date.now }
});

reviewSchema.index({ sc: 1, user: 1 }, { unique: true });

reviewSchema.post('save', async function(doc, next) {
    await doc.constructor.updateSCRating(doc.sc);
    next();
});

reviewSchema.post('remove', async function(doc, next) { // Mongoose 5+ remove hook
    await doc.constructor.updateSCRating(doc.sc);
    next();
});

reviewSchema.statics.updateSCRating = async function(scId) {
    const SourceCode = mongoose.model('SourceCode');
    const sc = await SourceCode.findById(scId);
    if (sc) {
        await sc.calculateAverageRating();
    }
};

module.exports = mongoose.model('Review', reviewSchema);