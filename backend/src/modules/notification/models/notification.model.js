const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipient_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    sender_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },

    title: {
        type: String,
        required: true,
        trim: true
    },

    message: {
        type: String,
        required: true,
        trim: true
    },

    /**
     * Ví dụ:
     * TASK_CREATE
     * TASK_UPDATE
     * TASK_MOVE
     * TASK_OVERDUE
     * EXTENSION_REQUEST
     * EXTENSION_SUBMITTED
     * EXTENSION_APPROVED
     * EXTENSION_APPROVED_BY_YOU
     * EXTENSION_REJECTED
     * EXTENSION_REJECTED_BY_YOU
     */
    type: {
        type: String,
        required: true,
        index: true
    },

    /**
     * ID đối tượng liên quan.
     * Với task notification: reference_id = task._id
     */
    reference_id: {
        type: mongoose.Schema.Types.ObjectId,
        index: true
    },

    /**
     * Loại đối tượng liên quan.
     * Ví dụ: TASK, PROJECT, BOARD, DEADLINE
     */
    reference_type: {
        type: String,
        default: 'TASK',
        index: true
    },

    /**
     * URL frontend để bấm vào notification là đi đúng nơi.
     * Ví dụ: /board/:boardId?taskId=:taskId
     */
    action_url: {
        type: String,
        default: null
    },

    /**
     * Metadata cho FE dựng popup hoặc điều hướng.
     * Ví dụ EXTENSION_REQUEST:
     * {
     *   task_id,
     *   board_id,
     *   task_title,
     *   requester_id,
     *   requester_name,
     *   current_due_date,
     *   requested_due_date,
     *   reason
     * }
     */
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },

    /**
     * Nội dung email HTML.
     * Không trả field này về FE ở notification.service.
     */
    email_html: {
        type: String
    },

    is_read: {
        type: Boolean,
        default: false,
        index: true
    },

    /**
     * PENDING: notification đã tạo trong DB nhưng email chờ cron gửi sau.
     * SENT: notification/email đã sẵn sàng hoặc không cần email delay.
     */
    status: {
        type: String,
        enum: ['PENDING', 'SENT'],
        default: 'SENT',
        index: true
    },

    send_at: {
        type: Date,
        index: true
    }

}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: false
    }
});

notificationSchema.index({ recipient_id: 1, created_at: -1 });
notificationSchema.index({ recipient_id: 1, is_read: 1 });
notificationSchema.index({ type: 1, reference_id: 1 });

module.exports = mongoose.model('Notification', notificationSchema);