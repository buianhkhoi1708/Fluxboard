const mongoose = require('mongoose');

const prefSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    email_notifications: { type: Boolean, default: true },
    push_notifications: { type: Boolean, default: true },
    task_deadline_reminders: { type: Boolean, default: true },
    daily_digest: { type: Boolean, default: false }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('UserNotificationPref', prefSchema);