const Notification = require('../models/notification.model');
const emailService = require('../../email/services/email.service');
const socketConfig = require('../../../common/config/socket');
const UserNotificationPref = require('../../user/models/userNotificationPref.model');

// 1. QUEUE NOTIFICATION (10 MINUTES DELAY)
exports.queueNotification = async (data) => {
    try {
        const DELAY_MINUTES = 10;
        const sendTime = new Date(Date.now() + DELAY_MINUTES * 60000);

        const existingNotif = await Notification.findOne({
            recipient_id: data.recipient_id,
            reference_id: data.reference_id,
            type: data.type,
            status: 'PENDING'
        });

        if (existingNotif) {
            existingNotif.send_at = sendTime; 
            existingNotif.sender_id = data.sender_id; 
            await existingNotif.save();
            return existingNotif;
        } else {
            return await Notification.create({
                ...data,
                status: 'PENDING',
                send_at: sendTime
            });
        }
    } catch (error) {
        console.error('Error queuing notification:', error);
    }
};

// 2. EXECUTE SENDING (CALLED BY CRON JOB)
exports.executePendingNotification = async (notificationId) => {
    // ... (Giữ nguyên logic hàm executePendingNotification của bạn) ...
};

// 3. GET USER NOTIFICATIONS
exports.getUserNotifications = async (userId, page = 1, limit = 20) => {
    const skip = (page - 1) * limit;
    return await Notification.find({ recipient_id: userId })
        .populate('sender_id', 'full_name avatar')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
};

// 4. MARK AS READ
exports.markAsRead = async (notificationId, userId) => {
    return await Notification.findOneAndUpdate(
        { _id: notificationId, recipient_id: userId },
        { is_read: true },
        { new: true }
    );
};