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

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const boardLink = `${frontendUrl}/boards/${task.board_id}`;
        
        // Format ngày giờ đẹp theo chuẩn tiếng Anh (VD: Oct 24, 2026, 3:30 PM)
        const formattedDate = new Date(task.due_date).toLocaleString('en-US', {
            hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'short', year: 'numeric'
        });

        if (prefs.email_notifications && user.email) {
            const subject = `🔥 [FluxBoard] DEADLINE ALERT: Task "${task.title}" is due soon!`;
            
            const emailHtml = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #fee2e2; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                <div style="background-color: #ef4444; padding: 25px 20px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">Upcoming Task Deadline</h1>
                </div>
                <div style="padding: 40px 30px; background-color: #ffffff;">
                    <p style="color: #4b5563; line-height: 1.6; font-size: 16px;">Hello <strong>${user.full_name}</strong>,</p>
                    <p style="color: #4b5563; line-height: 1.6; font-size: 16px;">This is an automated reminder from the system. A task assigned to you is approaching its deadline.</p>
                    
                    <div style="background-color: #fff1f2; border-left: 5px solid #e11d48; padding: 20px; margin: 25px 0; border-radius: 0 6px 6px 0;">
                        <h3 style="margin: 0 0 12px 0; color: #9f1239; font-size: 18px;">${task.title}</h3>
                        <p style="margin: 6px 0; color: #be123c; font-size: 15px;"><strong>⏰ Deadline:</strong> ${formattedDate}</p>
                        <p style="margin: 6px 0; color: #be123c; font-size: 15px;"><strong>🔥 Priority:</strong> ${task.priority}</p>
                    </div>
                    
                    <p style="color: #4b5563; line-height: 1.6; font-size: 16px;">Please log in to the workspace to review, complete, and update the task status to keep your team's workflow running smoothly.</p>
                    
                    <div style="text-align: center; margin: 35px 0;">
                        <a href="${boardLink}" style="background-color: #e11d48; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; display: inline-block;">View Task in Board</a>
                    </div>
                </div>
                <div style="background-color: #f9fafb; padding: 20px; text-align: center; font-size: 13px; color: #9ca3af; border-top: 1px solid #fee2e2;">
                    You are receiving this email because you have <strong>Task Deadline Reminders</strong> enabled in your preferences.<br><br>
                    &copy; ${new Date().getFullYear()} FluxBoard Team.
                </div>
            </div>
            `;

            emailService.sendEmail(user.email, subject, emailHtml).catch(err => console.error('Email failed:', err));
        }

        if (prefs.push_notifications) {
            const io = socketConfig.getIo();
            io.to(user._id.toString()).emit('notification', {
                type: 'DEADLINE_REMINDER',
                task_id: task._id,
                message: `Task "${task.title}" is due soon! Please update its status.`,
                created_at: new Date()
            });
        }

    } catch (error) {
        console.error(`Failed to dispatch notification for user ${user._id}:`, error);
    }
};