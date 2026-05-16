const mongoose = require('mongoose');

const projectMemberSchema = new mongoose.Schema({
    project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    
    // Trạng thái (true: Được vào, false: Bị đình chỉ tạm thời)
    is_active: { type: Boolean, default: true },
    
    // 💡 ĐIỂM NHẤN: Mảng Đa Quyền (Ví dụ: Vừa là Dev, vừa là Tester)
    role_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }], 
    
    // Cờ xóa mềm (Xóa hẳn thì true)
    is_deleted: { type: Boolean, default: false }
}, { 
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
});

// Chống add 1 người 2 lần vào cùng 1 dự án
projectMemberSchema.index({ project_id: 1, user_id: 1 }, { unique: true });

module.exports = mongoose.model('ProjectMember', projectMemberSchema);