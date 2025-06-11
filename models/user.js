const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['customer', 'seller', 'admin'], default: 'customer' },
    balance: { type: Number, default: 0 },
    profilePicture: { type: String, default: '/images/default-avatar.png' },
    storeName: { type: String, trim: true },
    bio: { type: String, trim: true, maxlength: 250 },
    location: { type: String, trim: true },
    website: { type: String, trim: true },
    qrisBaseCode: { type: String, trim: true },
    qrisMerchantId: { type: String, trim: true },
    qrisApiKey: { type: String, trim: true },
    pterodactylPanelUrl: { type: String, trim: true },
    pterodactylAppApiKey: { type: String, trim: true },
    pterodactylClientApiKey: { type: String, trim: true },
    pterodactylDefaultLocationId: { type: Number },
    pterodactylDefaultNestId: { type: Number },
    pterodactylDefaultEggId: { type: Number },
    apiKey: { type: String, unique: true, sparse: true }, // sparse: true agar unique index tidak error untuk dokumen tanpa apiKey
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }
    if (!this.apiKey) { // Generate API key jika belum ada
        this.apiKey = crypto.randomBytes(32).toString('hex');
    }
    next();
});

userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.generateApiKey = function() {
    this.apiKey = crypto.randomBytes(32).toString('hex');
    return this.apiKey;
};

const User = mongoose.models.User || mongoose.model('User', userSchema);
module.exports = User;
