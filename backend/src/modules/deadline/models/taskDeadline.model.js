const mongoose = require('mongoose');

const taskDeadlineSchema = new mongoose.Schema({
    task_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
        required: true,
        unique: true,
        index: true
    },

    start_date: {
        type: Date
    },

    due_date: {
        type: Date,
        required: true,
        index: true
    },

    actual_completed_at: {
        type: Date,
        default: null
    },

    // =====================================================
    // 1. CHỐNG SPAM GIA HẠN
    // =====================================================
    extension_limit: {
        type: Number,
        default: 2
    },

    extension_count: {
        type: Number,
        default: 0
    },

    extension_status: {
        type: String,
        enum: ['NONE', 'PENDING', 'APPROVED', 'REJECTED'],
        default: 'NONE',
        index: true
    },

    /**
     * Deadline mới đang chờ sếp/admin duyệt.
     * Khi approved thì pending_due_date sẽ được đẩy vào due_date.
     */
    pending_due_date: {
        type: Date,
        default: null
    },

    /**
     * Người gửi yêu cầu xin dời hạn.
     */
    extension_requested_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true
    },

    extension_requested_at: {
        type: Date,
        default: null
    },

    /**
     * Lý do nhân viên xin dời deadline.
     */
    extension_reason: {
        type: String,
        default: ''
    },

    /**
     * Người duyệt/từ chối yêu cầu.
     */
    extension_reviewed_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },

    extension_reviewed_at: {
        type: Date,
        default: null
    },

    /**
     * Lý do từ chối nếu admin/sếp reject.
     */
    extension_reject_reason: {
        type: String,
        default: ''
    },

    // =====================================================
    // 2. CỜ BÁO QUÉT CRONJOB
    // =====================================================
    reminder_sent: {
        type: Boolean,
        default: false,
        index: true
    },

    is_overdue: {
        type: Boolean,
        default: false,
        index: true
    },

    // =====================================================
    // 3. TRẠNG THÁI HOÀN THÀNH
    // =====================================================
    completion_status: {
        type: String,
        enum: ['PENDING', 'ON_TIME', 'LATE'],
        default: 'PENDING'
    },

    late_minutes: {
        type: Number,
        default: 0
    },

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

// Tối ưu truy vấn cron job
taskDeadlineSchema.index({ due_date: 1, is_overdue: 1, reminder_sent: 1 });

// Tối ưu lọc các request xin dời đang chờ duyệt
taskDeadlineSchema.index({ extension_status: 1, extension_requested_by: 1 });

module.exports = mongoose.model('TaskDeadline', taskDeadlineSchema);