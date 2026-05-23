const mongoose = require('mongoose');

const userSessionSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    token_hash: { type: String, required: true, unique: true }, // Lưu hash của JWT token để định danh phiên làm việc
    device_type: { type: String, default: 'Unknown Device' },
    ip_address: { type: String, default: '0.0.0.0' },
    is_active: { type: Boolean, default: true },
    last_activity: { type: Date, default: Date.now }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('UserSession', userSessionSchema);