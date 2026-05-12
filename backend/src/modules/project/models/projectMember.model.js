const mongoose = require('mongoose'); //[cite: 7]

const projectMemberSchema = new mongoose.Schema({
    // Lưu ID của dự án[cite: 7]
    project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true }, //[cite: 7]
    
    // Lưu ID của người dùng[cite: 7]
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }, //[cite: 7]
    
    // ĐÃ SỬA: Thay thế chuỗi 'role' cứng bằng 'role_id' trỏ đến bảng Role động
    role_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true } 
}, { 
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } //[cite: 7]
});

projectMemberSchema.index({ project_id: 1, user_id: 1 }, { unique: true }); //[cite: 7]

module.exports = mongoose.model('ProjectMember', projectMemberSchema); //[cite: 7]