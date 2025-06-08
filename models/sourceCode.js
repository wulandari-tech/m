const mongoose = require('mongoose');

const rentalOptionSchema = new mongoose.Schema({
    duration: { type: String, required: true }, 
    price: { type: Number, required: true, min: 0 }
});

const sourceCodeSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    tags: [{ type: String, trim: true }],
    techStack: [{ type: String, trim: true }],
    price_buy: { type: Number, min: 0 },
    is_for_rent_only: { type: Boolean, default: false },
    rental_options: [rentalOptionSchema],
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    filePath: { type: String }, // Path to the uploaded .zip file
    screenshots: [{ type: String }], // Paths to screenshot images
    demoUrl: { type: String, trim: true },
    status: { type: String, enum: ['pending_approval', 'approved', 'rejected', 'delisted'], default: 'pending_approval' },
    
    reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }],
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

sourceCodeSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    if (this.is_for_rent_only) {
        this.price_buy = undefined; // Ensure price_buy is null if only for rent
    }
    if (!this.is_for_rent_only && this.rental_options && this.rental_options.length === 0 && !this.price_buy) {
         // If not rent only, and no rental options, price_buy becomes mandatory (or should be handled in validation)
    }
    next();
});

sourceCodeSchema.methods.calculateAverageRating = async function() {
    const populatedReviews = await mongoose.model('Review').find({ sc: this._id });
    if (populatedReviews.length === 0) {
        this.averageRating = 0;
        this.totalReviews = 0;
    } else {
        const sum = populatedReviews.reduce((acc, review) => acc + review.rating, 0);
        this.averageRating = parseFloat((sum / populatedReviews.length).toFixed(1));
        this.totalReviews = populatedReviews.length;
    }
    await this.save({ timestamps: false }); // Avoid double updating updatedAt
};

module.exports = mongoose.model('SourceCode', sourceCodeSchema);