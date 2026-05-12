/**
 * src/modules/rbac/models/role.model.js
 */
const mongoose = require('mongoose');
const { Roles, Scopes } = require('../constants/rbac.enum');

const roleSchema = new mongoose.Schema({
    // Tên của Role, bắt buộc phải nằm trong danh sách khai báo[cite: 10]
    name: { 
        type: String, 
        enum: Object.values(Roles), 
        required: true, 
        unique: true, 
        index: true 
    },
    
    // Role này thuộc hệ thống hay dự án
    scope: { 
        type: String, 
        enum: Object.values(Scopes), 
        required: true 
    },
    
    description: { type: String },
    
    // Mảng chứa các ID của bảng Permission. Mấu chốt của tính năng "Dynamic RBAC"[cite: 10].
    permission_ids: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Permission' 
    }]
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('Role', roleSchema);