const emailService = require('../../email/services/email.service');
const socketConfig = require('../../../common/config/socket');
const UserNotificationPref = require('../../user/models/userNotificationPref.model');
const TaskDeadline = require('../models/taskDeadline.model');
const Task = require('../../task/models/task.model');
const AppError = require('../../../common/exceptions/AppError');
const eventBus = require('../../../common/utils/eventBus');

// ==========================================
// Helpers
// ==========================================
const isInvalidDate = (value) => {
    if (!value) return true;

    const date = new Date(value);

    return Number.isNaN(date.getTime());
};

const toDate = (value) => new Date(value);

const toIdString = (value) => {
    if (!value) return null;
    if (typeof value === 'object' && value._id) return value._id.toString();
    return value.toString();
};

const findActiveDeadline = async (taskId) => {
    return await TaskDeadline.findOne({
        task_id: taskId,
        is_deleted: { $ne: true }
    });
};

const findActiveTask = async (taskId) => {
    return await Task.findOne({
        _id: taskId,
        is_deleted: { $ne: true }
    }).lean();
};

const emitExtensionRequested = ({ taskId, userId, originalDueDate, newDueDate, reason }) => {
    eventBus.emit('extension_requested', {
        taskId,
        task_id: taskId,

        userId,
        requesterId: userId,

        originalDueDate,
        currentDueDate: originalDueDate,

        newDueDate,
        requestedDueDate: newDueDate,

        reason
    });
};

const emitExtensionApproved = ({
    taskId,
    managerId,
    requesterId,
    originalDueDate,
    approvedDueDate,
    reason
}) => {
    eventBus.emit('extension_approved', {
        taskId,
        task_id: taskId,

        managerId,
        userId: managerId,
        senderId: managerId,

        requesterId,
        userIdRequest: requesterId,

        originalDueDate,
        currentDueDate: originalDueDate,

        newDueDate: approvedDueDate,
        approvedDueDate,
        requestedDueDate: approvedDueDate,

        reason
    });
};

const emitExtensionRejected = ({
    taskId,
    managerId,
    requesterId,
    originalDueDate,
    requestedDueDate,
    reason,
    rejectReason
}) => {
    eventBus.emit('extension_rejected', {
        taskId,
        task_id: taskId,

        managerId,
        userId: managerId,
        senderId: managerId,

        requesterId,
        userIdRequest: requesterId,

        originalDueDate,
        currentDueDate: originalDueDate,

        requestedDueDate,
        newDueDate: requestedDueDate,

        reason,
        rejectReason
    });
};

// ==========================================
// 1. CÁC HÀM XỬ LÝ GIA HẠN (EXTENSION LOGIC)
// ==========================================

/**
 * Nhân viên xin dời deadline.
 *
 * Flow:
 * - Validate task/deadline tồn tại.
 * - Validate deadline mới phải sau deadline hiện tại.
 * - Validate phải có lý do.
 * - Lưu trạng thái PENDING vào TaskDeadline.
 * - Emit extension_requested để notificationDispatcher gửi:
 *   + thông báo cho sếp/admin
 *   + thông báo xác nhận đã gửi đơn cho nhân viên
 */
exports.requestExtension = async (taskId, userId, newDueDate, reason) => {
    const task = await findActiveTask(taskId);

    if (!task) {
        throw new AppError('Task not found', 404);
    }

    const deadline = await findActiveDeadline(taskId);

    if (!deadline) {
        throw new AppError('Deadline not found', 404);
    }

    if (isInvalidDate(newDueDate)) {
        throw new AppError('New due date is invalid or missing.', 400);
    }

    const parsedNewDueDate = toDate(newDueDate);
    const currentDueDate = toDate(deadline.due_date);

    if (parsedNewDueDate <= currentDueDate) {
        throw new AppError('The proposed deadline must be after the original deadline.', 400);
    }

    if (!reason || !String(reason).trim()) {
        throw new AppError('Extension reason is required.', 400);
    }

    if (deadline.extension_status === 'PENDING') {
        throw new AppError('You have already submitted a request. Please wait for approval!', 400);
    }

    if (deadline.extension_count >= deadline.extension_limit) {
        throw new AppError('Extension limit reached!', 400);
    }

    const originalDueDate = deadline.due_date;
    const cleanReason = String(reason).trim();

    deadline.extension_status = 'PENDING';
    deadline.pending_due_date = parsedNewDueDate;
    deadline.extension_requested_by = userId;
    deadline.extension_requested_at = new Date();
    deadline.extension_reason = cleanReason;

    // Reset dữ liệu review cũ nếu trước đó từng bị reject/approve
    deadline.extension_reviewed_by = null;
    deadline.extension_reviewed_at = null;
    deadline.extension_reject_reason = '';

    await deadline.save();

    emitExtensionRequested({
        taskId,
        userId,
        originalDueDate,
        newDueDate: parsedNewDueDate,
        reason: cleanReason
    });

    return deadline;
};

/**
 * Sếp/admin chấp nhận yêu cầu dời deadline.
 *
 * Flow:
 * - Chỉ duyệt khi đang PENDING.
 * - due_date = pending_due_date.
 * - Đồng bộ lại Task.due_date để FE fallback vẫn đúng.
 * - Tăng extension_count.
 * - Emit extension_approved để gửi notification cho cả nhân viên và sếp/admin.
 */
exports.approveExtension = async (taskId, managerId) => {
    const task = await findActiveTask(taskId);

    if (!task) {
        throw new AppError('Task not found', 404);
    }

    const deadline = await findActiveDeadline(taskId);

    if (!deadline || deadline.extension_status !== 'PENDING') {
        throw new AppError('No pending extension requests found.', 400);
    }

    if (!deadline.pending_due_date) {
        throw new AppError('Pending due date not found.', 400);
    }

    const requesterId = deadline.extension_requested_by;
    const originalDueDate = deadline.due_date;
    const approvedDueDate = deadline.pending_due_date;
    const requestReason = deadline.extension_reason;

    deadline.due_date = approvedDueDate;
    deadline.extension_count += 1;
    deadline.extension_status = 'APPROVED';
    deadline.pending_due_date = null;

    deadline.extension_reviewed_by = managerId;
    deadline.extension_reviewed_at = new Date();
    deadline.extension_reject_reason = '';

    // Reset lại cờ deadline để cron job kiểm tra theo hạn mới
    deadline.is_overdue = false;
    deadline.reminder_sent = false;

    // Nếu deadline mới sau hiện tại thì task chưa overdue
    if (new Date(approvedDueDate) > new Date()) {
        deadline.is_overdue = false;
    }

    await deadline.save();

    // Đồng bộ sang Task để FE nào đọc task.due_date trực tiếp vẫn đúng.
    await Task.findByIdAndUpdate(
        taskId,
        {
            $set: {
                due_date: approvedDueDate,
                start_date: deadline.start_date || task.start_date || null
            }
        },
        {
            new: false
        }
    );

    emitExtensionApproved({
        taskId,
        managerId,
        requesterId,
        originalDueDate,
        approvedDueDate,
        reason: requestReason
    });

    return deadline;
};

/**
 * Sếp/admin từ chối yêu cầu dời deadline.
 *
 * Flow:
 * - Chỉ từ chối khi đang PENDING.
 * - Không đổi due_date hiện tại.
 * - Xóa pending_due_date.
 * - Emit extension_rejected để gửi notification cho cả nhân viên và sếp/admin.
 */
exports.rejectExtension = async (taskId, managerId, rejectReason) => {
    const task = await findActiveTask(taskId);

    if (!task) {
        throw new AppError('Task not found', 404);
    }

    const deadline = await findActiveDeadline(taskId);

    if (!deadline || deadline.extension_status !== 'PENDING') {
        throw new AppError('No pending extension requests found.', 400);
    }

    const requesterId = deadline.extension_requested_by;
    const originalDueDate = deadline.due_date;
    const requestedDueDate = deadline.pending_due_date;
    const requestReason = deadline.extension_reason;
    const cleanRejectReason = rejectReason ? String(rejectReason).trim() : '';

    deadline.extension_status = 'REJECTED';
    deadline.pending_due_date = null;

    deadline.extension_reviewed_by = managerId;
    deadline.extension_reviewed_at = new Date();
    deadline.extension_reject_reason = cleanRejectReason;

    await deadline.save();

    emitExtensionRejected({
        taskId,
        managerId,
        requesterId,
        originalDueDate,
        requestedDueDate,
        reason: requestReason,
        rejectReason: cleanRejectReason
    });

    return deadline;
};

// ==========================================
// 2. GỬI MAIL DEADLINE REMINDER CŨ
// ==========================================

exports.sendDelayedNotification = (user, task, deadlineRecord, delayMinutes = 10) => {
    setTimeout(() => {
        exports.dispatchTaskDeadlineNotification(user, task, deadlineRecord);
    }, delayMinutes * 60 * 1000);
};

exports.dispatchTaskDeadlineNotification = async (user, task, deadlineRecord) => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const formattedDate = new Date(deadlineRecord.due_date).toLocaleString('vi-VN');

    const prefs = await UserNotificationPref.findOne({
        user_id: user._id
    }).lean();

    const emailEnabled =
        prefs?.email_notifications_enabled ??
        prefs?.email_notifications ??
        true;

    const pushEnabled =
        prefs?.in_app_notifications_enabled ??
        prefs?.push_notifications ??
        true;

    if (emailEnabled && user.email) {
        const subject = `[Urgent] Task Deadline Approaching: ${task.title}`;

        const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #ef4444; padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">Deadline Alert</h1>
            </div>
            <div style="padding: 30px; background-color: #ffffff;">
                <h2 style="color: #333333;">Hi ${user.full_name || user.email},</h2>
                <p style="color: #555555;">Your task is approaching its deadline.</p>
                <div style="background-color: #FEF2F2; padding: 15px; border-left: 4px solid #e11d48; margin: 20px 0;">
                    <p style="margin: 0; color: #991B1B;"><strong>Task:</strong> ${task.title}</p>
                    <p style="margin: 10px 0 0 0; color: #B91C1C;"><strong>Due Date:</strong> ${formattedDate}</p>
                </div>
                <div style="text-align: center; margin-top: 30px;">
                    <a href="${frontendUrl}/board/${task.board_id}?taskId=${task._id}" style="background-color: #e11d48; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                        View Task
                    </a>
                </div>
            </div>
        </div>`;

        emailService
            .sendEmail(user.email, subject, emailHtml)
            .catch(err => console.error('Email sending failed:', err));
    }

    if (pushEnabled) {
        const io = socketConfig.getIo();

        if (io) {
            io.to(user._id.toString()).emit('deadlineAlert', {
                task_id: task._id,
                board_id: task.board_id,
                title: task.title,
                message: `Deadline is approaching for: ${task.title}`,
                action_url: `/board/${task.board_id}?taskId=${task._id}`
            });
        }
    }
};