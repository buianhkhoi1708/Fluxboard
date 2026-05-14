const Notification = require('../models/notification.model');
const emailService = require('../../email/services/email.service');
const socketConfig = require('../../../common/config/socket');
const UserNotificationPref = require('../../user/models/userNotificationPref.model');
const eventBus = require('../../../common/utils/eventBus'); // Import trạm phát sóng

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
            
            // 👉 Phát sóng: Cập nhật thông báo cũ
            eventBus.emit(`new_notification_for_${existingNotif.recipient_id}`, existingNotif);
            
            return existingNotif;
        } else {
            const newNotif = await Notification.create({
                ...data,
                status: 'PENDING',
                send_at: sendTime
            });

            // 👉 Phát sóng: Bắn thông báo mới tinh cho user
            eventBus.emit(`new_notification_for_${newNotif.recipient_id}`, newNotif);

            return newNotif;
        }
    } catch (error) {
        console.error('Error queuing notification:', error);
    }
};

// 2. EXECUTE SENDING (CALLED BY CRON JOB)
exports.executePendingNotification = async (notificationId) => {
    try {
        const notif = await Notification.findByIdAndUpdate(
            notificationId, 
            { status: 'SENT' }, 
            { new: true }
        ).populate('recipient_id', 'email full_name'); // Nhớ populate để lấy email

        if (notif && notif.recipient_id) {
            // 👉 Phát sóng qua Socket (Real-time)
            eventBus.emit(`new_notification_for_${notif.recipient_id._id}`, notif);

            // 👉 Gửi qua Email (Dựa vào type hoặc nội dung)
            // Lấy email Html hoặc nội dung cần gửi. Ở đây mình gọi emailService
            const subject = `[Fluxboard] ${notif.title}`;
            const html = `<p>Xin chào ${notif.recipient_id.full_name},</p>
                          <p>${notif.message}</p>`;
            
            emailService.sendEmail(notif.recipient_id.email, subject, html)
                        .catch(err => console.error('Email error:', err));
        }
    } catch (error) {
        console.error('Error executing pending notification:', error);
    }
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