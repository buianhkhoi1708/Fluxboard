const Notification = require('../models/notification.model');
const emailService = require('../../email/services/email.service');
const eventBus = require('../../../common/utils/eventBus');

// ==========================================
// 1. QUEUE NOTIFICATION (10 MINUTES DELAY FOR EMAIL)
// ==========================================
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
            existingNotif.email_html = data.email_html; 
            await existingNotif.save();
            
            // 💡 CẮT BỎ HTML TRƯỚC KHI TRẢ VỀ FRONTEND/POSTMAN
            const notifToClient = existingNotif.toObject();
            delete notifToClient.email_html;
            
            eventBus.emit(`new_notification_for_${notifToClient.recipient_id.toString()}`, notifToClient);
            return existingNotif;
        } else {
            const newNotif = await Notification.create({
                ...data,
                status: 'PENDING',
                send_at: sendTime
            });
            
            // 💡 CẮT BỎ HTML TRƯỚC KHI TRẢ VỀ FRONTEND/POSTMAN
            const notifToClient = newNotif.toObject();
            delete notifToClient.email_html;

            eventBus.emit(`new_notification_for_${notifToClient.recipient_id.toString()}`, notifToClient);
            return newNotif;
        }
    } catch (error) {
        console.error('Error queuing notification:', error);
    }
};

// ==========================================
// 2. EXECUTE SENDING EMAIL (CALLED BY CRON JOB 10 MINS LATER)
// ==========================================
exports.executePendingNotification = async (notificationId) => {
    try {
        const notif = await Notification.findByIdAndUpdate(
            notificationId, 
            { status: 'SENT' }, 
            { returnDocument: 'after' } 
        ).populate('recipient_id', 'email full_name'); 

        if (notif && notif.recipient_id) {
            const subject = `[Fluxboard] ${notif.title}`;
            
            const html = notif.email_html || `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2>Hi ${notif.recipient_id.full_name},</h2>
                <p style="font-size: 16px;">${notif.message}</p>
                <p style="color: #666; font-size: 14px; margin-top: 20px;">Best regards,<br>Fluxboard System</p>
            </div>`;
            
            emailService.sendEmail(notif.recipient_id.email, subject, html)
                        .catch(err => console.error('Email error:', err));
        }
    } catch (error) {
        console.error('Error executing pending notification:', error);
    }
};

// ==========================================
// 3. GET USER NOTIFICATIONS
// ==========================================
exports.getUserNotifications = async (userId, page = 1, limit = 20) => {
    const skip = (page - 1) * limit;
    // 💡 Lấy API cũng nhớ Select trừ cái email_html ra cho nhẹ API
    return await Notification.find({ recipient_id: userId })
        .select('-email_html')
        .populate('sender_id', 'full_name avatar_url') 
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
};

// ==========================================
// 4. MARK AS READ
// ==========================================
exports.markAsRead = async (notificationId, userId) => {
    return await Notification.findOneAndUpdate(
        { _id: notificationId, recipient_id: userId },
        { is_read: true },
        { returnDocument: 'after' } 
    ).select('-email_html'); // 💡 Cắt bỏ HTML
};