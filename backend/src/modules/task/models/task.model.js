const mongoose = require('mongoose');

const subtaskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    is_done: { type: Boolean, default: false }
});

const taskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    
    column_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Column', required: true, index: true },
    board_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true, index: true },
    
    // 🚀 BẮT BUỘC: Phải có mảng này để UI hiển thị được nhiều người thực hiện
    assignees_user_id: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    assignee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // Giữ lại backup
    
    priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' },
    is_done: { type: Boolean, default: false },
    
    // 🚀 BẮT BUỘC: Thêm Story Point để Frontend không bị lỗi
    story_point: { type: Number, default: 0 },

    tags: [{ type: String }],
    subtasks: [subtaskSchema],
    is_deleted: { type: Boolean, default: false }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// 🚀 THUẬT TOÁN KẾT NỐI VỚI BẢNG DEADLINE (Cực kỳ quan trọng để lúc F5 trang không bị mất ngày)
taskSchema.virtual('deadline_info', {
    ref: 'TaskDeadline',
    localField: '_id',
    foreignField: 'task_id',
    justOne: true // 1 Task chỉ có 1 Deadline
});

// Cho phép hiển thị trường ảo (virtual) khi query JSON
taskSchema.set('toObject', { virtuals: true });
taskSchema.set('toJSON', { virtuals: true });

taskSchema.index({ board_id: 1, column_id: 1 });

module.exports = mongoose.model('Task', taskSchema);