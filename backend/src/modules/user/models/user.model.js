const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password_hash: { type: String, required: true, select: false }, 
    password: { type: String, select: false }, 
    full_name: { type: String, required: true, trim: true },
    avatar_url: { type: String, default: null },
    
    // Ràng buộc tổ chức (Organization)
    department_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null, index: true },
    team_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null, index: true },
    
    // Ràng buộc phân quyền hệ thống (System RBAC)
    role_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
    
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    reset_password_token: { type: String, select: false },
    reset_password_expires: { type: Date, select: false }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('User', userSchema);