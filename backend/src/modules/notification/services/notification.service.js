const emailService = require('../../email/services/email.service');
const socketConfig = require('../../../common/config/socket');
const UserNotificationPref = require('../../user/models/userNotificationPref.model');

exports.dispatchTaskDeadlineNotification = async (user, task) => {
    try {
        let prefs = await UserNotificationPref.findOne({ user_id: user._id }).lean();
        if (!prefs) {
            prefs = { email_notifications: true, push_notifications: true, task_deadline_reminders: true };
        }

        if (!prefs.task_deadline_reminders) return;

        const message = `Task "${task.title}" is due on ${new Date(task.due_date).toLocaleDateString()}. Please complete it on time.`;

        if (prefs.email_notifications && user.email) {
            const subject = `[FluxBoard] Reminder: Task "${task.title}" is due soon!`;
            const htmlContent = `
                <h3>Hello ${user.full_name},</h3>
                <p>This is a reminder that your assigned task <strong>${task.title}</strong> is approaching its deadline.</p>
                <p><strong>Due Date:</strong> ${new Date(task.due_date).toLocaleString()}</p>
                <br>
                <p>Best regards,<br>FluxBoard Team</p>
            `;
            emailService.sendEmail(user.email, subject, htmlContent).catch(err => console.error('Email failed:', err));
        }

        if (prefs.push_notifications) {
            const io = socketConfig.getIo();
            io.to(user._id.toString()).emit('notification', {
                type: 'DEADLINE_REMINDER',
                task_id: task._id,
                message: message,
                created_at: new Date()
            });
        }

    } catch (error) {
        console.error(`Failed to dispatch notification for user ${user._id}:`, error);
    }
};