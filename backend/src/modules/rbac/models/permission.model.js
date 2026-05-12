/**
 * src/modules/rbac/models/permission.model.js
 */
const mongoose = require('mongoose');
const { Scopes, Resources, Actions } = require('../constants/rbac.enum');

const permissionSchema = new mongoose.Schema({
    // Resource là đối tượng bị tác động (Ví dụ: 'PROJECT', 'TASK')
    resource: { 
        type: String, 
        enum: Object.values(Resources),
        required: true, 
        index: true 
    }, 
    
    // Action là hành động thực hiện (Ví dụ: 'CREATE', 'DELETE')
    action: { 
        type: String, 
        enum: Object.values(Actions),
        required: true 
    },  
    
    // Scope phân biệt quyền này dùng cho toàn hệ thống hay nội bộ 1 dự án[cite: 9]
    scope: { 
        type: String, 
        enum: Object.values(Scopes), 
        required: true 
    },
    
    description: { type: String }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Đảm bảo không tạo trùng lặp một quyền giống hệt nhau[cite: 9]
permissionSchema.index({ resource: 1, action: 1, scope: 1 }, { unique: true });

module.exports = mongoose.model('Permission', permissionSchema);