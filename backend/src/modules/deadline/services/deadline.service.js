const emailService = require('../../email/services/email.service');
const socketConfig = require('../../../common/config/socket');
const UserNotificationPref = require('../../user/models/userNotificationPref.model');

// Thêm tham số deadlineRecord
exports.dispatchTaskDeadlineNotification = async (user, task, deadlineRecord) => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    // Lấy due_date từ bảng TaskDeadline
    const formattedDate = new Date(deadlineRecord.due_date).toLocaleString('en-US');

    const prefs = await UserNotificationPref.findOne({ user_id: user._id }) || { email_notifications: true, push_notifications: true };

    if (prefs.email_notifications) {
        const subject = `[Urgent] Task Deadline Approaching: ${task.title}`;
        const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #ef4444; padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">Deadline Alert</h1>
            </div>
            <div style="padding: 30px; background-color: #ffffff;">
                <h2 style="color: #333333;">Hi ${user.full_name},</h2>
                <p style="color: #555555;">Your task is approaching its deadline.</p>
                <div style="background-color: #FEF2F2; padding: 15px; border-left: 4px solid #e11d48; margin: 20px 0;">
                    <p style="margin: 0; color: #991B1B;"><strong>Task:</strong> ${task.title}</p>
                    <p style="margin: 10px 0 0 0; color: #B91C1C;"><strong>Due Date:</strong> ${formattedDate}</p>
                </div>
                <div style="text-align: center; margin-top: 30px;">
                    <a href="${frontendUrl}/boards/${task.board_id}" style="background-color: #e11d48; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Task</a>
                </div>
            </div>
        </div>`;
        
        emailService.sendEmail(user.email, subject, emailHtml).catch(err => console.error('Email sending failed:', err));
    }

    if (prefs.push_notifications) {
        const io = socketConfig.getIo();
        io.to(user._id.toString()).emit('deadlineAlert', {
            task_id: task._id,
            title: task.title,
            message: `Deadline is approaching for: ${task.title}`
        });
    }
};