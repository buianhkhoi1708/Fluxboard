const mongoose = require('mongoose');

const subtaskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },

    is_done: {
        type: Boolean,
        default: false
    }
});

const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },

    description: {
        type: String,
        default: ''
    },

    /**
     * project_id để dashboard, activity, AI insight, notification có thể truy ngược project.
     * Không required để không làm gãy dữ liệu cũ.
     */
    project_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        default: null,
        index: true
    },

    column_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Column',
        required: true,
        index: true
    },

    board_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Board',
        required: true,
        index: true
    },

    /**
     * Người tạo task.
     * Rất quan trọng cho flow xin dời hạn:
     * nhân viên xin dời -> gửi request về author_user_id / project owner / admin.
     */
    author_user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true
    },

    /**
     * Người đánh dấu hoàn thành task gần nhất.
     */
    completed_by_user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true
    },

    completed_at: {
        type: Date,
        default: null
    },

    /**
     * Dùng cho task con nếu sau này AI tạo subtasks dạng task riêng.
     */
    parent_task_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
        default: null,
        index: true
    },

    // Hiển thị nhiều người thực hiện trên UI
    assignees_user_id: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],

    // Giữ lại để tương thích code cũ
    assignee_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },

    priority: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
        default: 'MEDIUM'
    },

    /**
     * Giữ cả status và is_done để tương thích FE hiện tại.
     */
    status: {
        type: String,
        enum: ['TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED'],
        default: 'TODO',
        index: true
    },

    is_done: {
        type: Boolean,
        default: false,
        index: true
    },

    /**
     * Thứ tự task trong column.
     */
    order: {
        type: Number,
        default: 0
    },

    story_point: {
        type: Number,
        default: 0
    },

    /**
     * Các field AI estimation.
     * Để tránh mất dữ liệu khi ai.service.js insert task AI.
     */
    ai_suggested_point: {
        type: Number,
        default: 0
    },

    ai_estimated_reason: {
        type: String,
        default: ''
    },

    /**
     * Field dự phòng để FE hiển thị ngay.
     * Nguồn deadline chính vẫn là TaskDeadline qua virtual deadline_info.
     */
    start_date: {
        type: Date,
        default: null
    },

    due_date: {
        type: Date,
        default: null
    },

    tags: [{
        type: String
    }],

    subtasks: [subtaskSchema],

    is_deleted: {
        type: Boolean,
        default: false,
        index: true
    }

}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
});

// Kết nối với bảng Deadline để F5 không mất ngày
taskSchema.virtual('deadline_info', {
    ref: 'TaskDeadline',
    localField: '_id',
    foreignField: 'task_id',
    justOne: true
});

// Cho phép hiển thị virtual khi query JSON
taskSchema.set('toObject', { virtuals: true });
taskSchema.set('toJSON', { virtuals: true });

taskSchema.index({ board_id: 1, column_id: 1 });
taskSchema.index({ board_id: 1, is_deleted: 1 });
taskSchema.index({ assignees_user_id: 1, is_deleted: 1 });
taskSchema.index({ author_user_id: 1, is_deleted: 1 });
taskSchema.index({ completed_by_user_id: 1, is_deleted: 1 });

module.exports = mongoose.model('Task', taskSchema);