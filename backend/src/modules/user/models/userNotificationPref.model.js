const mongoose = require('mongoose');

const prefSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
        index: true
    },

    /**
     * Bật/tắt gửi email notification.
     * false => không queue/gửi Gmail cho user này.
     */
    email_notifications: {
        type: Boolean,
        default: true,
        index: true
    },

    /**
     * Bật/tắt notification realtime/in-app.
     * false => không emit long polling/socket/toast/header cho user này.
     */
    push_notifications: {
        type: Boolean,
        default: true,
        index: true
    },

    /**
     * Bật/tắt riêng nhóm nhắc deadline.
     * false => không gửi nhắc deadline sắp đến/quá hạn.
     */
    task_deadline_reminders: {
        type: Boolean,
        default: true,
        index: true
    }
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
});

prefSchema.index({ user_id: 1, email_notifications: 1 });
prefSchema.index({ user_id: 1, push_notifications: 1 });
prefSchema.index({ user_id: 1, task_deadline_reminders: 1 });

module.exports = mongoose.model('UserNotificationPref', prefSchema);