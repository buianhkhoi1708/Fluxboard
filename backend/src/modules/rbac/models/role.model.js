const mongoose = require('mongoose');
const { Scopes } = require('../constants/rbac.enum'); // Bỏ import Roles

const roleSchema = new mongoose.Schema({
    // Bỏ enum để hỗ trợ Dynamic Role từ UI
    name: { 
        type: String, 
        required: true, 
        unique: true, 
        index: true,
        uppercase: true // Ép kiểu in hoa cho chuẩn
    },
    scope: { 
        type: String, 
        enum: Object.values(Scopes), 
        required: true 
    },
    description: { type: String },
    permission_ids: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Permission' 
    }]
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('Role', roleSchema);