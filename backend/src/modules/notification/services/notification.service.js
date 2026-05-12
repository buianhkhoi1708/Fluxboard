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
    try {
        const notification = await Notification.findById(notificationId)
            .populate('recipient_id', 'full_name email')
            .populate('sender_id', 'full_name avatar_url');

        if (!notification) return;

        const user = notification.recipient_id;
        let prefs = await UserNotificationPref.findOne({ user_id: user._id }).lean();
        if (!prefs) prefs = { email_notifications: true, push_notifications: true };

        if (prefs.push_notifications) {
            const io = socketConfig.getIo();
            io.to(user._id.toString()).emit('newNotification', notification);
        }

        if (notification.type === 'ASSIGN_TASK' && notification.sender_id && prefs.email_notifications && user.email) {
            const taskTitle = notification.message.split(': ')[1] || 'New task';
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            const boardLink = notification.reference_id ? `${frontendUrl}/tasks/${notification.reference_id}` : frontendUrl;

            const subject = `[Fluxboard] Update: ${notification.sender_id.full_name} has assigned a task to you`;
            const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden;">
                <div style="background-color: #4F46E5; padding: 20px; text-align: center;"><h1 style="color: white; margin: 0; font-size: 24px;">Fluxboard</h1></div>
                <div style="padding: 30px; background-color: #ffffff;">
                    <h2 style="color: #333333;">Hi ${user.full_name},</h2>
                    <p style="color: #555555;">Your colleague <strong>${notification.sender_id.full_name}</strong> just assigned you to a task on Fluxboard.</p>
                    <div style="background-color: #F3F4F6; padding: 15px; border-left: 4px solid #4F46E5; margin: 20px 0;"><p style="margin: 0;"><strong>Task name:</strong> ${taskTitle}</p></div>
                    <div style="text-align: center; margin-top: 30px;"><a href="${boardLink}" style="background-color: #4F46E5; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Task</a></div>
                </div>
            </div>`;
            emailService.sendEmail(user.email, subject, emailHtml).catch(err => console.error('Email sending failed:', err));
        }

        notification.status = 'SENT';
        await notification.save();
    } catch (error) { console.error('Error executing notification:', error); }
};

// 3. GET USER NOTIFICATIONS
exports.getUserNotifications = async (userId, page = 1, limit = 20) => {
    const skip = (page - 1) * limit;
    const [notifications, total] = await Promise.all([
        Notification.find({ recipient_id: userId, status: 'SENT' }).populate('sender_id', 'full_name avatar_url').sort({ created_at: -1 }).skip(skip).limit(limit),
        Notification.countDocuments({ recipient_id: userId, status: 'SENT' })
    ]);
    return { content: notifications, page_meta: { total_elements: total, total_pages: Math.ceil(total / limit), current_page: page, page_size: limit } };
};

// 4. MARK AS READ
exports.markAsRead = async (notificationId, userId) => {
    return await Notification.findOneAndUpdate({ _id: notificationId, recipient_id: userId }, { is_read: true }, { returnDocument: 'after' });
};

// 5. DISPATCH DEADLINE NOTIFICATION
exports.dispatchTaskDeadlineNotification = async (user, task) => {
    try {
        let prefs = await UserNotificationPref.findOne({ user_id: user._id }).lean();
        if (!prefs) prefs = { email_notifications: true, push_notifications: true, task_deadline_reminders: true };
        if (!prefs.task_deadline_reminders) return;

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const formattedDate = new Date(task.due_date).toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'short', year: 'numeric' });

        if (prefs.email_notifications && user.email) {
            const subject = `🔥 [FluxBoard] DEADLINE ALERT: Task "${task.title}" is due soon!`;
            const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden;">
                <div style="background-color: #e11d48; padding: 20px; text-align: center;"><h1 style="color: white; margin: 0; font-size: 24px;">Deadline Alert</h1></div>
                <div style="padding: 30px; background-color: #ffffff;">
                    <h2 style="color: #333333;">Hi ${user.full_name},</h2>
                    <p style="color: #555555;">Your task is approaching its deadline.</p>
                    <div style="background-color: #FEF2F2; padding: 15px; border-left: 4px solid #e11d48; margin: 20px 0;"><p style="margin: 0; color: #991B1B;"><strong>Task:</strong> ${task.title}</p><p style="margin: 10px 0 0 0; color: #B91C1C;"><strong>Due Date:</strong> ${formattedDate}</p></div>
                    <div style="text-align: center; margin-top: 30px;"><a href="${frontendUrl}/boards/${task.board_id}" style="background-color: #e11d48; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Task</a></div>
                </div>
            </div>`;
            emailService.sendEmail(user.email, subject, emailHtml).catch(err => console.error('Email sending failed:', err));
        }

        if (prefs.push_notifications) {
            const io = socketConfig.getIo();
            io.to(user._id.toString()).emit('notification', { type: 'DEADLINE_REMINDER', task_id: task._id, message: `Task "${task.title}" is due soon! Please update its status.`, created_at: new Date() });
        }
    } catch (error) { console.error('Error dispatching deadline notification:', error); }
};