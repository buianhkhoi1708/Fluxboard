const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    // 💡 Đổi sang String để tương thích kiểu định danh lai giữa Java và Node.js
    owner_id: { type: String, required: true, index: true },
    // 💡 BỔ SUNG: Khóa ngoại liên kết trực tiếp dự án vào Phòng ban của sơ đồ tổ chức Organization
    department_id: { type: String, default: null, index: true },
    status: { type: String, default: 'ACTIVE' },
    is_deleted: { type: Boolean, default: false } 
}, { 
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false
});

// Ép buộc Mongoose sử dụng đúng tên bộ sưu tập chuẩn của hệ thống, chặn tự động sinh bảng viết liền
module.exports = mongoose.model('Project', projectSchema, 'projects');