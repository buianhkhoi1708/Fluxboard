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
    assignee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    
    priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' },
    
    // 💡 ĐÃ THÊM: Trường is_done (Cực kỳ quan trọng để Dashboard tính KPI)
    is_done: { type: Boolean, default: false },

    // 💡 ĐÃ XÓA: start_date, due_date, estimated_days (Vì đã chuyển sang bảng task_deadlines)
    tags: [{ type: String }],
    subtasks: [subtaskSchema],

    is_deleted: { type: Boolean, default: false }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

taskSchema.index({ board_id: 1, column_id: 1 });

module.exports = mongoose.model('Task', taskSchema);