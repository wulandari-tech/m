const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    sourceCode: { type: mongoose.Schema.Types.ObjectId, ref: 'SourceCode', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, trim: true, maxlength: 1000 },
    createdAt: { type: Date, default: Date.now }
});

reviewSchema.index({ sourceCode: 1, user: 1 }, { unique: true });

reviewSchema.statics.calculateAverageRating = async function(sourceCodeId) {
    const SourceCode = mongoose.model('SourceCode');
    if (!SourceCode) return;

    const stats = await this.aggregate([
        { $match: { sourceCode: new mongoose.Types.ObjectId(sourceCodeId) } },
        {
            $group: {
                _id: '$sourceCode',
                averageRating: { $avg: '$rating' },
                totalReviews: { $sum: 1 }
            }
        }
    ]);

    try {
        if (stats.length > 0) {
            await SourceCode.findByIdAndUpdate(sourceCodeId, {
                averageRating: parseFloat(stats[0].averageRating.toFixed(1)),
                totalReviews: stats[0].totalReviews
            });
        } else {
            await SourceCode.findByIdAndUpdate(sourceCodeId, {
                averageRating: 0,
                totalReviews: 0
            });
        }
    } catch (err) {
        console.error('Error updating average rating:', err);
    }
};

reviewSchema.post('save', async function() {
    await this.constructor.calculateAverageRating(this.sourceCode);
});

reviewSchema.post('remove', async function(doc) {
    await doc.constructor.calculateAverageRating(doc.sourceCode);
});

reviewSchema.post('findOneAndDelete', async function(doc) {
    if (doc) {
        await mongoose.model('Review').calculateAverageRating(doc.sourceCode);
    }
});

reviewSchema.post('deleteMany', async function(result, docs) {
    if (docs && docs.length > 0) {
        const sourceCodeIds = [...new Set(docs.map(doc => doc.sourceCode.toString()))];
        for (const scId of sourceCodeIds) {
            await mongoose.model('Review').calculateAverageRating(new mongoose.Types.ObjectId(scId));
        }
    }
});


module.exports = mongoose.models.Review || mongoose.model('Review', reviewSchema);