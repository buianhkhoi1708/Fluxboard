const Notification = require('../models/notification.model');
const User = require('../../user/models/user.model');
const emailService = require('../../email/services/email.service');
const eventBus = require('../../../common/utils/eventBus');

const getDelayMinutes = (value) => {
    if (value === undefined || value === null) return 10;

    const numberValue = Number(value);

    if (Number.isNaN(numberValue) || numberValue < 0) return 10;

    return numberValue;
};

const buildSendTime = (delayMinutes) => {
    return new Date(Date.now() + delayMinutes * 60000);
};

const sanitizeNotificationData = (data = {}) => {
    const {
        email_delay_minutes,
        ...dataToSave
    } = data;

    return dataToSave;
};

const emitNotificationToLongPolling = (notification) => {
    if (!notification) return;

    const notifToClient =
        typeof notification.toObject === 'function'
            ? notification.toObject()
            : { ...notification };

    delete notifToClient.email_html;

    if (!notifToClient.recipient_id) return;

    eventBus.emit(`new_notification_for_${notifToClient.recipient_id.toString()}`, notifToClient);
};

// ==========================================
// 1. QUEUE NOTIFICATION
// ==========================================
exports.queueNotification = async (data) => {
    try {
        const delayMinutes = getDelayMinutes(data.email_delay_minutes);
        const sendTime = buildSendTime(delayMinutes);
        const dataToSave = sanitizeNotificationData(data);

        const existingNotif = await Notification.findOne({
            recipient_id: data.recipient_id,
            reference_id: data.reference_id,
            type: data.type,
            status: 'PENDING'
        });

        if (existingNotif) {
            existingNotif.send_at = sendTime;
            existingNotif.sender_id = dataToSave.sender_id || null;
            existingNotif.title = dataToSave.title;
            existingNotif.message = dataToSave.message;
            existingNotif.type = dataToSave.type;
            existingNotif.reference_id = dataToSave.reference_id || null;
            existingNotif.reference_type = dataToSave.reference_type || 'TASK';
            existingNotif.action_url = dataToSave.action_url || null;
            existingNotif.metadata = dataToSave.metadata || {};
            existingNotif.email_html = dataToSave.email_html;
            existingNotif.is_read = false;

            await existingNotif.save();

            emitNotificationToLongPolling(existingNotif);

            return existingNotif;
        }

        const newNotif = await Notification.create({
            ...dataToSave,
            status: 'PENDING',
            send_at: sendTime
        });

        emitNotificationToLongPolling(newNotif);

        return newNotif;
    } catch (error) {
        console.error('Error queuing notification:', error);
        return null;
    }
};

// ==========================================
// 2. EXECUTE SENDING EMAIL
// ==========================================
exports.executePendingNotification = async (notificationId) => {
    try {
        const notif = await Notification.findById(notificationId)
            .populate('recipient_id', 'email full_name')
            .exec();

        if (!notif || notif.status === 'SENT') {
            return null;
        }

        if (!notif.recipient_id) {
            notif.status = 'SENT';
            await notif.save();
            return notif;
        }

        const recipientEmail = notif.recipient_id.email;

        if (!recipientEmail) {
            notif.status = 'SENT';
            await notif.save();
            return notif;
        }

        const subject = `[Fluxboard] ${notif.title}`;

        const html = notif.email_html || `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2>Hi ${notif.recipient_id.full_name || notif.recipient_id.email},</h2>
                <p style="font-size: 16px;">${notif.message}</p>
                <p style="color: #666; font-size: 14px; margin-top: 20px;">Best regards,<br>Fluxboard System</p>
            </div>`;

        await emailService.sendEmail(recipientEmail, subject, html);

        notif.status = 'SENT';
        await notif.save();

        return notif;
    } catch (error) {
        console.error('Error executing pending notification:', error);
        return null;
    }
};

// ==========================================
// 3. GET USER NOTIFICATIONS
// ==========================================
exports.getUserNotifications = async (userId, page = 1, limit = 20) => {
    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.max(Number(limit) || 20, 1);
    const skip = (safePage - 1) * safeLimit;

    return await Notification.find({ recipient_id: userId })
        .select('-email_html')
        .populate('sender_id', 'full_name avatar_url email')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean();
};

// ==========================================
// 4. MARK AS READ
// ==========================================
exports.markAsRead = async (notificationId, userId) => {
    return await Notification.findOneAndUpdate(
        {
            _id: notificationId,
            recipient_id: userId
        },
        {
            is_read: true
        },
        {
            returnDocument: 'after'
        }
    ).select('-email_html');
};