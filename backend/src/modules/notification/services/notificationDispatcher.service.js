const User = require('../../user/models/user.model');
const Task = require('../../task/models/task.model');
const Column = require('../../column/models/column.model'); 
const notificationService = require('./notification.service'); 
const UserNotificationPref = require('../../user/models/userNotificationPref.model'); 
const socketConfig = require('../../../common/config/socket');
const emailService = require('../../email/services/email.service');

// Cấu hình khung giao diện Email chuẩn hóa bằng tiếng Anh
const getBaseTemplate = (color, title, bodyContent) => `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);">
    <div style="background-color: ${color}; padding: 25px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px; letter-spacing: 1px;">${title}</h1>
    </div>
    <div style="padding: 35px; background-color: #ffffff; color: #333333; line-height: 1.6; font-size: 16px;">
        ${bodyContent}
    </div>
    <div style="background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #666666; border-top: 1px solid #e5e7eb;">
        This is an automated notification from Fluxboard System. Please do not reply directly to this email.
    </div>
</div>`;

// Hàm xử lý phân phối thông báo đồng thời qua Email (Delay 10p ngầm) và Web Socket real-time công việc công ty
const dispatch = async (recipientId, title, message, emailHtml, type, referenceId) => {
    if (!recipientId) return;

    const recipient = await User.findById(recipientId).lean();
    if (!recipient) return;

    const prefs = await UserNotificationPref.findOne({ user_id: recipientId }).lean() || { email_notifications: true, push_notifications: true };

    if (prefs.push_notifications) {
        const io = socketConfig.getIo();
        if (io) {
            io.to(recipientId.toString()).emit('newNotification', {
                title,
                message,
                type,
                reference_id: referenceId,
                created_at: new Date()
            });
        }
    }

    if (prefs.email_notifications && recipient.email) {
        await notificationService.queueNotification({
            recipient_id: recipientId,
            title,
            message,
            type,
            reference_id: referenceId,
            email_html: emailHtml,
            status: 'PENDING'
        });
    }
};

// ==========================================
// THÊM MỚI: THÔNG BÁO TẠO TASK (Sau khi hết 10 phút delay)
// ==========================================
exports.dispatchTaskCreated = async (payload) => {
    const task = await Task.findById(payload.task_id || payload.taskId).lean();
    if (!task || !task.assignee_id) return;

    const html = getBaseTemplate('#10B981', 'New Task Assigned 🚀', `
        <p>Hi ${task.assignee_id.full_name || 'Team Member'},</p>
        <p>A new task has been created and assigned to you in the system.</p>
        <div style="background-color: #ECFDF5; padding: 15px; border-left: 4px solid #10B981; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #065F46;"><strong>Task Title:</strong> ${task.title}</p>
            <p style="margin: 5px 0 0 0; color: #047857;"><strong>Priority:</strong> ${task.priority || 'MEDIUM'}</p>
        </div>
        <p>Please access your dashboard workspace to check details and start working.</p>
    `);

    await dispatch(task.assignee_id, 'New Task Assigned', `You have been assigned to a new task: ${task.title}`, html, 'TASK_CREATE', task._id);
};

// ==========================================
// THÊM MỚI: THÔNG BÁO TRỄ DEADLINE (Trigger qua Cron Job ngày mới)
// ==========================================
exports.dispatchTaskOverdue = async (recipientId, task, deadline) => {
    const formattedDate = new Date(deadline.due_date).toLocaleString('en-US');

    const html = getBaseTemplate('#EF4444', 'Task Overdue Alert 🚨', `
        <p>Hi,</p>
        <p>This is an urgent system alert indicating that your assigned task has passed its due date without completion.</p>
        <div style="background-color: #FEF2F2; padding: 15px; border-left: 4px solid #EF4444; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #991B1B;"><strong>Overdue Task:</strong> ${task.title}</p>
            <p style="margin: 10px 0 0 0; color: #B91C1C;"><strong>Missed Deadline:</strong> ${formattedDate}</p>
        </div>
        <p style="color: #EF4444; font-weight: bold;">Please complete the task or contact your Project Manager to request a deadline extension immediately.</p>
    `);

    await dispatch(recipientId, 'Task Overdue Notice', `Urgent: Your task "${task.title}" is overdue!`, html, 'TASK_OVERDUE', task._id);
};

exports.dispatchTaskUpdated = async (payload) => {
    const task = await Task.findById(payload.taskId).lean();
    if (!task || !task.assignee_id) return;

    const html = getBaseTemplate('#3F51B5', 'Task Content Updated 📝', `
        <p>Hi,</p>
        <p>The details of a task assigned to you have been modified by a team member.</p>
        <div style="background-color: #E8EAF6; padding: 15px; border-left: 4px solid #3F51B5; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #1A237E;"><strong>Task:</strong> ${task.title}</p>
        </div>
        <p>Please log in to the system to check the latest details.</p>
    `);
    await dispatch(task.assignee_id, 'Task Updated', `Task details have been updated: ${task.title}`, html, 'TASK_UPDATE', task._id);
};

exports.dispatchTaskMoved = async (payload) => {
    const task = await Task.findById(payload.taskId).lean();
    if (!task || !task.assignee_id) return;

    const column = await Column.findById(payload.destColumnId).lean();
    const colName = column ? column.title : 'another stage';

    const html = getBaseTemplate('#8B5CF6', 'Task Status Changed 🚀', `
        <p>Hi,</p>
        <p>A task assigned to you has been moved to a new stage.</p>
        <div style="background-color: #F5F3FF; padding: 15px; border-left: 4px solid #7C3AED; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #5B21B6;"><strong>Task:</strong> ${task.title}</p>
            <p style="margin: 5px 0 0 0; color: #4C1D95;"><strong>New Stage:</strong> ${colName}</p>
        </div>
    `);
    await dispatch(task.assignee_id, 'Task Moved', `Task "${task.title}" was moved to ${colName}`, html, 'TASK_MOVE', task._id);
};

exports.dispatchExtensionRequest = async (payload) => {
    const task = await Task.findById(payload.taskId).lean();
    if (!task || !task.owner_id) return;
    const originalDate = new Date(payload.originalDueDate).toLocaleString('en-US');
    const requestedDate = new Date(payload.newDueDate).toLocaleString('en-US');

    const html = getBaseTemplate('#F59E0B', 'Extension Requested ⏳', `
        <p>Hi,</p>
        <p>A team member has requested a deadline extension for a task under your management.</p>
        <div style="background-color: #FFFBEB; padding: 15px; border-left: 4px solid #D97706; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #92400E;"><strong>Task:</strong> ${task.title}</p>
            <p style="margin: 5px 0 0 0; color: #92400E;"><strong>Original Date:</strong> ${originalDate}</p>
            <p style="margin: 5px 0 0 0; color: #B45309;"><strong>Requested New Date:</strong> ${requestedDate}</p>
            <p style="margin: 5px 0 0 0; color: #78350F;"><strong>Reason:</strong> ${payload.reason || 'No reason provided'}</p>
        </div>
    `);
    await dispatch(task.owner_id, 'Extension Request', `New extension request submitted for: ${task.title}`, html, 'EXTENSION_REQUEST', task._id);
};

exports.dispatchExtensionApproved = async (payload) => {
    const task = await Task.findById(payload.taskId).lean();
    if (!task || !task.assignee_id) return;
    const newDate = new Date(payload.newDueDate).toLocaleString('en-US');

    const html = getBaseTemplate('#10B981', 'Extension Approved ✅', `
        <p>Hi,</p>
        <p>Great news! Your deadline extension request has been approved by the manager.</p>
        <div style="background-color: #ECFDF5; padding: 15px; border-left: 4px solid #10B981; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #065F46;"><strong>Task:</strong> ${task.title}</p>
            <p style="margin: 5px 0 0 0; color: #047857;"><strong>New Due Date:</strong> ${newDate}</p>
        </div>
    `);
    await dispatch(task.assignee_id, 'Extension Approved', `Your extension request for "${task.title}" was approved`, html, 'EXTENSION_APPROVE', task._id);
};

exports.dispatchExtensionRejected = async (payload) => {
    const task = await Task.findById(payload.taskId).lean();
    if (!task || !task.assignee_id) return;

    const html = getBaseTemplate('#EF4444', 'Extension Rejected ❌', `
        <p>Hi,</p>
        <p>Your deadline extension request has been rejected by the manager.</p>
        <div style="background-color: #FEF2F2; padding: 15px; border-left: 4px solid #EF4444; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #991B1B;"><strong>Task:</strong> ${task.title}</p>
            <p style="margin: 5px 0 0 0; color: #7F1D1D;"><strong>Reason:</strong> ${payload.rejectReason || 'No reason provided'}</p>
        </div>
    `);
    await dispatch(task.assignee_id, 'Extension Rejected', `Your extension request for "${task.title}" was rejected`, html, 'EXTENSION_REJECT', task._id);
};