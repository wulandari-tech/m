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
    filePath: { type: String },
    screenshots: [{ type: String }],
    demoUrl: { type: String, trim: true },
    status: {
        type: String,
        enum: ['pending_approval', 'approved', 'rejected', 'delisted'],
        default: 'approved'
    },
    isPublic: { type: Boolean, default: true }, // Field baru untuk visibilitas
    reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }],
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
    productType: {
        type: String,
        enum: ['source_code', 'panel_service'],
        default: 'source_code',
        required: true
    },
    panelRamMB: { type: Number, min: 0 },
    panelDiskMB: { type: Number, min: 0 },
    panelCpuPercentage: { type: Number, min: 0 },
    panelMaxDatabases: { type: Number, min: 0, default: 1 },
    panelMaxAllocations: { type: Number, min: 0, default: 1 },
    panelMaxBackups: { type: Number, min: 0, default: 1 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

sourceCodeSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    if (this.productType === 'panel_service') {
        this.is_for_rent_only = false;
        this.rental_options = [];
        this.filePath = undefined;
        this.screenshots = [];
        this.tags = [];
        this.techStack = [];
    } else if (this.is_for_rent_only) {
        this.price_buy = undefined;
    }
    next();
});

module.exports = mongoose.models.SourceCode || mongoose.model('SourceCode', sourceCodeSchema);