const emailService = require('../../email/services/email.service');
const socketConfig = require('../../../common/config/socket');
const UserNotificationPref = require('../../user/models/userNotificationPref.model');
const TaskDeadline = require('../models/taskDeadline.model');
const AppError = require('../../../common/exceptions/AppError');
const eventBus = require('../../../common/utils/eventBus');

// ==========================================
// 1. CÁC HÀM XỬ LÝ GIA HẠN (EXTENSION LOGIC)
// ==========================================
exports.requestExtension = async (taskId, userId, newDueDate, reason) => {
    const deadline = await TaskDeadline.findOne({ task_id: taskId });
    if (!deadline) throw new AppError('Deadline not found', 404);

    if (deadline.extension_status === 'PENDING') {
        throw new AppError('You have already submitted a request. Please wait for approval!', 400);
    }
    if (deadline.extension_count >= deadline.extension_limit) {
        throw new AppError('Extension limit reached!', 400);
    }

    deadline.extension_status = 'PENDING';
    deadline.pending_due_date = newDueDate;
    await deadline.save();

    eventBus.emit('extension_requested', { taskId, userId, newDueDate, reason });
    return deadline;
};

exports.approveExtension = async (taskId, managerId) => {
    const deadline = await TaskDeadline.findOne({ task_id: taskId });
    if (!deadline || deadline.extension_status !== 'PENDING') {
        throw new AppError('No pending extension requests found.', 400);
    }

    deadline.due_date = deadline.pending_due_date;
    deadline.extension_count += 1;
    deadline.extension_status = 'APPROVED';
    deadline.pending_due_date = null;
    deadline.is_overdue = false; 
    deadline.reminder_sent = false; 
    await deadline.save();

    eventBus.emit('extension_approved', { taskId, managerId, newDueDate: deadline.due_date });
    return deadline;
};

exports.rejectExtension = async (taskId, managerId, rejectReason) => {
    const deadline = await TaskDeadline.findOne({ task_id: taskId });
    if (!deadline) throw new AppError('Deadline not found', 404);

    deadline.extension_status = 'REJECTED';
    deadline.pending_due_date = null;
    await deadline.save();

    eventBus.emit('extension_rejected', { taskId, managerId, rejectReason });
    return deadline;
};

// ==========================================
// 2. GỬI MAIL (CÓ DELAY)
// ==========================================
exports.sendDelayedNotification = (user, task, deadlineRecord, delayMinutes = 10) => {
    console.log(`⏳ Will send reminder email for task ${task._id} in ${delayMinutes} minutes...`);
    setTimeout(() => {
        this.dispatchTaskDeadlineNotification(user, task, deadlineRecord);
    }, delayMinutes * 60 * 1000);
};

// Hàm cũ của bạn (Đã giữ nguyên format HTML)
exports.dispatchTaskDeadlineNotification = async (user, task, deadlineRecord) => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
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