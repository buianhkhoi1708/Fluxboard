const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password_hash: { type: String, required: true, select: false },
    full_name: { type: String, required: true, trim: true },
    avatar_url: { type: String, default: null },
    department_id: { type: mongoose.Schema.Types.ObjectId, default: null },
    system_role_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }],
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    reset_password_token: { type: String, select: false },
    reset_password_expires: { type: Date, select: false }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('User', userSchema);