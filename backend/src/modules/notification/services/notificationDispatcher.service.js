const User = require('../../user/models/user.model');
const Task = require('../../task/models/task.model');
const Column = require('../../column/models/column.model');
const Board = require('../../board/models/board.model');
const Project = require('../../project/models/project.model');
const Notification = require('../models/notification.model');
const notificationService = require('./notification.service');
const UserNotificationPref = require('../../user/models/userNotificationPref.model');
const socketConfig = require('../../../common/config/socket');
const eventBus = require('../../../common/utils/eventBus');

const getFrontendUrl = () => process.env.FRONTEND_URL || 'http://localhost:5173';

const IMMEDIATE_EMAIL_TYPES = new Set([
    'EXTENSION_REQUEST',
    'EXTENSION_SUBMITTED',
    'EXTENSION_APPROVED',
    'EXTENSION_APPROVED_BY_YOU',
    'EXTENSION_REJECTED',
    'EXTENSION_REJECTED_BY_YOU',
    'TASK_COMPLETED',
    'TASK_COMPLETED_BY_YOU'
]);

const DEADLINE_REMINDER_TYPES = new Set([
    'TASK_OVERDUE',
    'TASK_DEADLINE_REMINDER',
    'DEADLINE_REMINDER'
]);

const formatDate = (value) => {
    if (!value) return 'Không rõ';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return 'Không rõ';
    }

    return date.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

const escapeHtml = (value) => {
    if (value === null || value === undefined) return '';

    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

const toIdString = (value) => {
    if (!value) return null;
    if (typeof value === 'object' && value._id) return value._id.toString();
    return value.toString();
};

const idsEqual = (a, b) => {
    const aId = toIdString(a);
    const bId = toIdString(b);

    if (!aId || !bId) return false;

    return aId === bId;
};

const addRecipient = (set, value) => {
    const id = toIdString(value);

    if (id) {
        set.add(id);
    }
};

const getTaskActionUrl = (task) => {
    if (!task || !task.board_id || !task._id) return null;

    return `/board/${task.board_id}?taskId=${task._id}`;
};

const buildTaskMetadata = (task, extra = {}) => ({
    task_id: task?._id ? task._id.toString() : null,
    board_id: task?.board_id ? task.board_id.toString() : null,
    task_title: task?.title || 'Không rõ task',
    priority: task?.priority || 'MEDIUM',
    ...extra
});

const getBaseTemplate = (color, title, bodyContent) => `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);">
    <div style="background-color: ${color}; padding: 25px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px; letter-spacing: 1px;">${escapeHtml(title)}</h1>
    </div>
    <div style="padding: 35px; background-color: #ffffff; color: #333333; line-height: 1.6; font-size: 16px;">
        ${bodyContent}
    </div>
    <div style="background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #666666; border-top: 1px solid #e5e7eb;">
        This is an automated notification from Fluxboard System. Please do not reply directly to this email.
    </div>
</div>`;

const getNotificationPrefs = async (recipientId) => {
    const prefs = await UserNotificationPref.findOne({
        user_id: recipientId.toString()
    }).lean();

    return {
        emailEnabled:
            prefs?.email_notifications_enabled ??
            prefs?.email_notifications ??
            true,

        inAppEnabled:
            prefs?.in_app_notifications_enabled ??
            prefs?.push_notifications ??
            true,

        deadlineReminderEnabled:
            prefs?.task_deadline_reminders ??
            true
    };
};

const emitRealtimeNotification = (recipientId, notification) => {
    if (!recipientId || !notification) return;

    const notifToClient =
        typeof notification.toObject === 'function'
            ? notification.toObject()
            : { ...notification };

    delete notifToClient.email_html;

    eventBus.emit(`new_notification_for_${notifToClient.recipient_id.toString()}`, notifToClient);

    const io = socketConfig.getIo();

    if (io) {
        io.to(recipientId.toString()).emit('newNotification', notifToClient);
    }
};

const getProjectOwnerIdFromTask = async (task) => {
    if (!task) return null;

    try {
        let projectId = task.project_id || null;

        if (!projectId && task.board_id) {
            const board = await Board.findById(task.board_id)
                .select('project_id')
                .lean();

            projectId = board?.project_id || null;
        }

        if (!projectId) return null;

        const project = await Project.findById(projectId)
            .select('owner_id')
            .lean();

        return project?.owner_id || null;
    } catch (error) {
        console.error('[Notification] Cannot resolve project owner:', error);
        return null;
    }
};

const findFallbackAdminId = async () => {
    try {
        const admin = await User.findOne({
            $or: [
                { role: 'ADMIN' },
                { role: 'admin' },
                { role_name: 'ADMIN' },
                { role_name: 'admin' },
                { system_role: 'ADMIN' },
                { system_role: 'admin' }
            ],
            is_deleted: { $ne: true }
        })
            .select('_id')
            .lean();

        return admin?._id || null;
    } catch (error) {
        return null;
    }
};

const resolveTaskManagerId = async (task, payload = {}) => {
    const requesterId = payload.userId || payload.requesterId || null;

    const candidates = [];

    if (payload.managerId) candidates.push(payload.managerId);
    if (payload.receiverId) candidates.push(payload.receiverId);
    if (payload.recipientId) candidates.push(payload.recipientId);
    if (task?.author_user_id) candidates.push(task.author_user_id);

    const projectOwnerId = await getProjectOwnerIdFromTask(task);
    if (projectOwnerId) candidates.push(projectOwnerId);

    const fallbackAdminId = await findFallbackAdminId();
    if (fallbackAdminId) candidates.push(fallbackAdminId);

    const validCandidates = candidates
        .map(toIdString)
        .filter(Boolean);

    const notRequester = validCandidates.find((id) => !idsEqual(id, requesterId));

    return notRequester || validCandidates[0] || null;
};

/**
 * Dispatch trung tâm.
 *
 * Rule cấu hình:
 * - email_notifications=false: vẫn lưu notification DB nhưng không queue/gửi email.
 * - push_notifications=false: vẫn lưu notification DB nhưng không emit realtime/long polling/socket.
 * - task_deadline_reminders=false: bỏ qua nhóm notification nhắc deadline.
 */
const dispatch = async (
    recipientId,
    senderId,
    title,
    message,
    emailHtml,
    type,
    referenceId,
    referenceType = 'TASK',
    actionUrl = null,
    metadata = {},
    options = {}
) => {
    if (!recipientId) return null;

    const recipient = await User.findById(recipientId).lean();
    if (!recipient) return null;

    const {
        emailEnabled,
        inAppEnabled,
        deadlineReminderEnabled
    } = await getNotificationPrefs(recipientId);

    if (DEADLINE_REMINDER_TYPES.has(type) && !deadlineReminderEnabled) {
        return null;
    }

    const emailDelayMinutes =
        options.emailDelayMinutes !== undefined
            ? options.emailDelayMinutes
            : IMMEDIATE_EMAIL_TYPES.has(type)
                ? 0
                : 10;

    const notifData = {
        recipient_id: recipientId,
        sender_id: senderId || null,
        title,
        message,
        type,
        reference_id: referenceId || null,
        reference_type: referenceType,
        action_url: actionUrl,
        metadata: metadata || {}
    };

    let savedNotif = null;

    if (emailEnabled && recipient.email) {
        savedNotif = await notificationService.queueNotification({
            ...notifData,
            email_html: emailHtml,
            status: 'PENDING',
            email_delay_minutes: emailDelayMinutes,
            emit_realtime: inAppEnabled
        });
    } else {
        savedNotif = await Notification.create({
            ...notifData,
            status: 'SENT'
        });

        if (inAppEnabled) {
            emitRealtimeNotification(recipientId, savedNotif);
        }
    }

    if (inAppEnabled && savedNotif && emailEnabled && recipient.email) {
        const io = socketConfig.getIo();

        if (io) {
            const notifToClient =
                typeof savedNotif.toObject === 'function'
                    ? savedNotif.toObject()
                    : { ...savedNotif };

            delete notifToClient.email_html;

            io.to(recipientId.toString()).emit('newNotification', notifToClient);
        }
    }

    return savedNotif;
};

// ==========================================
// 1. THÔNG BÁO TẠO TASK
// ==========================================
exports.dispatchTaskCreated = async (payload) => {
    const task = await Task.findById(payload.task_id || payload.taskId).lean();
    if (!task) return;

    const assignees = Array.isArray(task.assignees_user_id) ? task.assignees_user_id : [];
    const actorId = payload.userId || payload.senderId || task.author_user_id || null;

    if (!assignees.length && !actorId) return;

    const actionUrl = getTaskActionUrl(task);
    const metadata = buildTaskMetadata(task);

    const html = getBaseTemplate('#10B981', 'New Task Assigned 🚀', `
        <p>A new task has been created and assigned in the system.</p>
        <div style="background-color: #ECFDF5; padding: 15px; border-left: 4px solid #10B981; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #065F46;"><strong>Task Title:</strong> ${escapeHtml(task.title)}</p>
            <p style="margin: 5px 0 0 0; color: #047857;"><strong>Priority:</strong> ${escapeHtml(task.priority || 'MEDIUM')}</p>
        </div>
        ${actionUrl ? `<p><a href="${getFrontendUrl()}${actionUrl}">View Task</a></p>` : ''}
    `);

    for (const assigneeId of assignees) {
        await dispatch(
            assigneeId,
            actorId,
            'Được giao công việc mới',
            `Bạn vừa được phân công vào task: ${task.title}`,
            html,
            'TASK_CREATE',
            task._id,
            'TASK',
            actionUrl,
            metadata
        );
    }

    if (actorId) {
        await dispatch(
            actorId,
            actorId,
            'Task Created Successfully',
            `Bạn đã tạo task: ${task.title}`,
            html,
            'TASK_CREATE_BY_YOU',
            task._id,
            'TASK',
            actionUrl,
            metadata
        );
    }
};

// ==========================================
// 2. THÔNG BÁO TRỄ DEADLINE
// ==========================================
exports.dispatchTaskOverdue = async (recipientId, task, deadline) => {
    if (!recipientId || !task) return;

    const formattedDate = formatDate(deadline?.due_date);
    const actionUrl = getTaskActionUrl(task);

    const metadata = buildTaskMetadata(task, {
        due_date: deadline?.due_date || null,
        is_overdue: true
    });

    const html = getBaseTemplate('#EF4444', 'Task Overdue Alert 🚨', `
        <div style="background-color: #FEF2F2; padding: 15px; border-left: 4px solid #EF4444; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #991B1B;"><strong>Overdue Task:</strong> ${escapeHtml(task.title)}</p>
            <p style="margin: 10px 0 0 0; color: #B91C1C;"><strong>Missed Deadline:</strong> ${escapeHtml(formattedDate)}</p>
        </div>
        ${actionUrl ? `<p><a href="${getFrontendUrl()}${actionUrl}">View Task</a></p>` : ''}
    `);

    await dispatch(
        recipientId,
        null,
        'Task Overdue Notice',
        `Task "${task.title}" đã quá hạn!`,
        html,
        'TASK_OVERDUE',
        task._id,
        'TASK',
        actionUrl,
        metadata
    );
};

// ==========================================
// 3. THÔNG BÁO CẬP NHẬT TASK
// ==========================================
exports.dispatchTaskUpdated = async (payload) => {
    const task = await Task.findById(payload.taskId || payload.task_id).lean();
    if (!task || !task.assignees_user_id || !task.assignees_user_id.length) return;

    const actorId = payload.userId || payload.senderId || null;
    const actionUrl = getTaskActionUrl(task);
    const metadata = buildTaskMetadata(task);

    const html = getBaseTemplate('#3F51B5', 'Task Content Updated 📝', `
        <div style="background-color: #E8EAF6; padding: 15px; border-left: 4px solid #3F51B5; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #1A237E;"><strong>Task:</strong> ${escapeHtml(task.title)}</p>
        </div>
        ${actionUrl ? `<p><a href="${getFrontendUrl()}${actionUrl}">View Task</a></p>` : ''}
    `);

    for (const assigneeId of task.assignees_user_id) {
        await dispatch(
            assigneeId,
            actorId,
            'Task Updated',
            `Task details have been updated: ${task.title}`,
            html,
            'TASK_UPDATE',
            task._id,
            'TASK',
            actionUrl,
            metadata
        );
    }

    if (actorId) {
        await dispatch(
            actorId,
            actorId,
            'Task Updated by You',
            `Bạn đã cập nhật task: ${task.title}`,
            html,
            'TASK_UPDATE_BY_YOU',
            task._id,
            'TASK',
            actionUrl,
            metadata
        );
    }
};

// ==========================================
// 4. THÔNG BÁO DI CHUYỂN TRẠNG THÁI TASK
// ==========================================
exports.dispatchTaskMoved = async (payload) => {
    const task = await Task.findById(payload.taskId || payload.task_id).lean();
    if (!task || !task.assignees_user_id || !task.assignees_user_id.length) return;

    const column = await Column.findById(payload.destColumnId || payload.dest_column_id).lean();
    const colName = column?.name || column?.list_name || column?.title || 'another stage';
    const actorId = payload.userId || payload.senderId || null;
    const actionUrl = getTaskActionUrl(task);

    const metadata = buildTaskMetadata(task, {
        destination_column_id: payload.destColumnId || payload.dest_column_id || null,
        destination_column_name: colName
    });

    const html = getBaseTemplate('#8B5CF6', 'Task Status Changed 🚀', `
        <div style="background-color: #F5F3FF; padding: 15px; border-left: 4px solid #7C3AED; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #5B21B6;"><strong>Task:</strong> ${escapeHtml(task.title)}</p>
            <p style="margin: 5px 0 0 0; color: #4C1D95;"><strong>New Stage:</strong> ${escapeHtml(colName)}</p>
        </div>
        ${actionUrl ? `<p><a href="${getFrontendUrl()}${actionUrl}">View Task</a></p>` : ''}
    `);

    for (const assigneeId of task.assignees_user_id) {
        await dispatch(
            assigneeId,
            actorId,
            'Task Moved',
            `Task "${task.title}" was moved to ${colName}`,
            html,
            'TASK_MOVE',
            task._id,
            'TASK',
            actionUrl,
            metadata
        );
    }

    if (actorId) {
        await dispatch(
            actorId,
            actorId,
            'Task Moved by You',
            `Bạn đã chuyển task "${task.title}" sang ${colName}`,
            html,
            'TASK_MOVE_BY_YOU',
            task._id,
            'TASK',
            actionUrl,
            metadata
        );
    }
};

// ==========================================
// 5. YÊU CẦU GIA HẠN DEADLINE
// ==========================================
exports.dispatchExtensionRequest = async (payload) => {
    const task = await Task.findById(payload.taskId || payload.task_id).lean();
    if (!task) return;

    const requester = await User.findById(payload.userId || payload.requesterId).lean();

    const requesterId = payload.userId || payload.requesterId;
    const requesterName =
        requester?.full_name ||
        requester?.email ||
        'Nhân viên';

    const managerId = await resolveTaskManagerId(task, {
        ...payload,
        userId: requesterId
    });

    const actionUrl = getTaskActionUrl(task);

    const metadata = buildTaskMetadata(task, {
        requester_id: requesterId ? requesterId.toString() : null,
        requester_name: requesterName,
        current_due_date: payload.originalDueDate || payload.currentDueDate || null,
        requested_due_date: payload.newDueDate || payload.requestedDueDate || null,
        reason: payload.reason || ''
    });

    const htmlForManager = getBaseTemplate('#6366F1', 'Yêu cầu dời deadline', `
        <p><strong>${escapeHtml(requesterName)}</strong> vừa gửi yêu cầu xin dời hạn task.</p>
        <div style="background:#EEF2FF;padding:16px;border-left:4px solid #6366F1;border-radius:8px;margin:20px 0;">
            <p><strong>Task:</strong> ${escapeHtml(task.title)}</p>
            <p><strong>Deadline hiện tại:</strong> ${escapeHtml(formatDate(metadata.current_due_date))}</p>
            <p><strong>Deadline mới:</strong> ${escapeHtml(formatDate(metadata.requested_due_date))}</p>
            <p><strong>Lý do:</strong> ${escapeHtml(payload.reason || 'Không có')}</p>
        </div>
        ${actionUrl ? `<p><a href="${getFrontendUrl()}${actionUrl}">Xem chi tiết task</a></p>` : ''}
    `);

    if (managerId) {
        await dispatch(
            managerId,
            requesterId,
            'Yêu cầu dời deadline',
            `${requesterName} xin dời deadline task: ${task.title}`,
            htmlForManager,
            'EXTENSION_REQUEST',
            task._id,
            'TASK',
            actionUrl,
            metadata
        );
    } else {
        console.warn('[Notification] Không tìm thấy manager/project owner/admin để gửi yêu cầu dời deadline:', task._id);
    }

    const htmlForRequester = getBaseTemplate('#10B981', 'Đã gửi đơn xin dời hạn', `
        <p>Yêu cầu xin dời deadline của bạn đã được gửi tới quản lý.</p>
        <div style="background:#ECFDF5;padding:16px;border-left:4px solid #10B981;border-radius:8px;margin:20px 0;">
            <p><strong>Task:</strong> ${escapeHtml(task.title)}</p>
            <p><strong>Deadline hiện tại:</strong> ${escapeHtml(formatDate(metadata.current_due_date))}</p>
            <p><strong>Deadline mới:</strong> ${escapeHtml(formatDate(metadata.requested_due_date))}</p>
            <p><strong>Lý do:</strong> ${escapeHtml(payload.reason || 'Không có')}</p>
        </div>
        ${actionUrl ? `<p><a href="${getFrontendUrl()}${actionUrl}">Xem task</a></p>` : ''}
    `);

    if (requesterId) {
        await dispatch(
            requesterId,
            requesterId,
            'Đã gửi đơn xin dời hạn',
            `Bạn đã gửi đơn xin dời hạn task: ${task.title}`,
            htmlForRequester,
            'EXTENSION_SUBMITTED',
            task._id,
            'TASK',
            actionUrl,
            metadata
        );
    }
};

// ==========================================
// 6. PHÊ DUYỆT GIA HẠN
// ==========================================
exports.dispatchExtensionApproved = async (payload) => {
    const task = await Task.findById(payload.taskId || payload.task_id).lean();
    if (!task) return;

    const managerId =
        payload.managerId ||
        payload.userId ||
        payload.senderId ||
        task.author_user_id ||
        await getProjectOwnerIdFromTask(task);

    const requesterId = payload.requesterId || payload.userIdRequest || null;
    const actionUrl = getTaskActionUrl(task);

    const metadata = buildTaskMetadata(task, {
        requester_id: requesterId ? requesterId.toString() : null,
        current_due_date: payload.originalDueDate || null,
        approved_due_date: payload.newDueDate || null,
        requested_due_date: payload.newDueDate || null,
        reason: payload.reason || ''
    });

    const html = getBaseTemplate('#10B981', 'Dời deadline thành công ✅', `
        <p>Yêu cầu dời deadline đã được chấp nhận.</p>
        <div style="background:#ECFDF5;padding:16px;border-left:4px solid #10B981;border-radius:8px;margin:20px 0;">
            <p><strong>Task:</strong> ${escapeHtml(task.title)}</p>
            <p><strong>Deadline mới:</strong> ${escapeHtml(formatDate(payload.newDueDate))}</p>
        </div>
        ${actionUrl ? `<p><a href="${getFrontendUrl()}${actionUrl}">Xem task</a></p>` : ''}
    `);

    const recipients = new Set();

    if (requesterId) {
        addRecipient(recipients, requesterId);
    } else if (Array.isArray(task.assignees_user_id)) {
        task.assignees_user_id.forEach((id) => addRecipient(recipients, id));
    }

    for (const recipientId of recipients) {
        await dispatch(
            recipientId,
            managerId,
            'Dời deadline thành công',
            `Yêu cầu dời deadline task "${task.title}" đã được chấp nhận.`,
            html,
            'EXTENSION_APPROVED',
            task._id,
            'TASK',
            actionUrl,
            metadata
        );
    }

    if (managerId) {
        await dispatch(
            managerId,
            managerId,
            'Bạn đã chấp nhận dời deadline',
            `Bạn đã chấp nhận dời deadline task: ${task.title}`,
            html,
            'EXTENSION_APPROVED_BY_YOU',
            task._id,
            'TASK',
            actionUrl,
            metadata
        );
    }
};

// ==========================================
// 7. TỪ CHỐI GIA HẠN
// ==========================================
exports.dispatchExtensionRejected = async (payload) => {
    const task = await Task.findById(payload.taskId || payload.task_id).lean();
    if (!task) return;

    const managerId =
        payload.managerId ||
        payload.userId ||
        payload.senderId ||
        task.author_user_id ||
        await getProjectOwnerIdFromTask(task);

    const requesterId = payload.requesterId || payload.userIdRequest || null;
    const actionUrl = getTaskActionUrl(task);

    const metadata = buildTaskMetadata(task, {
        requester_id: requesterId ? requesterId.toString() : null,
        current_due_date: payload.originalDueDate || null,
        requested_due_date: payload.requestedDueDate || payload.newDueDate || null,
        reason: payload.reason || '',
        reject_reason: payload.rejectReason || ''
    });

    const html = getBaseTemplate('#EF4444', 'Yêu cầu dời deadline bị từ chối ❌', `
        <p>Yêu cầu dời deadline đã bị từ chối.</p>
        <div style="background:#FEF2F2;padding:16px;border-left:4px solid #EF4444;border-radius:8px;margin:20px 0;">
            <p><strong>Task:</strong> ${escapeHtml(task.title)}</p>
            <p><strong>Lý do từ chối:</strong> ${escapeHtml(payload.rejectReason || 'Không có')}</p>
        </div>
        ${actionUrl ? `<p><a href="${getFrontendUrl()}${actionUrl}">Xem task</a></p>` : ''}
    `);

    const recipients = new Set();

    if (requesterId) {
        addRecipient(recipients, requesterId);
    } else if (Array.isArray(task.assignees_user_id)) {
        task.assignees_user_id.forEach((id) => addRecipient(recipients, id));
    }

    for (const recipientId of recipients) {
        await dispatch(
            recipientId,
            managerId,
            'Yêu cầu dời deadline bị từ chối',
            `Yêu cầu dời deadline task "${task.title}" đã bị từ chối.`,
            html,
            'EXTENSION_REJECTED',
            task._id,
            'TASK',
            actionUrl,
            metadata
        );
    }

    if (managerId) {
        await dispatch(
            managerId,
            managerId,
            'Bạn đã từ chối dời deadline',
            `Bạn đã từ chối yêu cầu dời deadline task: ${task.title}`,
            html,
            'EXTENSION_REJECTED_BY_YOU',
            task._id,
            'TASK',
            actionUrl,
            metadata
        );
    }
};

// ==========================================
// 8. THÔNG BÁO HOÀN THÀNH TASK
// ==========================================
exports.dispatchTaskCompleted = async (payload) => {
    const task = await Task.findById(payload.taskId || payload.task_id).lean();
    if (!task) return;

    const actorId =
        payload.userId ||
        payload.senderId ||
        payload.completedBy ||
        payload.completed_by ||
        null;

    const actor = actorId ? await User.findById(actorId).lean() : null;

    const actorName =
        actor?.full_name ||
        actor?.email ||
        'Một thành viên';

    const completedAt = payload.completedAt || payload.completed_at || new Date();

    const actionUrl = getTaskActionUrl(task);

    const metadata = buildTaskMetadata(task, {
        completed_by_id: actorId ? actorId.toString() : null,
        completed_by_name: actorName,
        completed_at: completedAt
    });

    const html = getBaseTemplate('#10B981', 'Task đã hoàn thành ✅', `
        <p>Task đã được đánh dấu hoàn thành.</p>
        <div style="background:#ECFDF5;padding:16px;border-left:4px solid #10B981;border-radius:8px;margin:20px 0;">
            <p><strong>Task:</strong> ${escapeHtml(task.title)}</p>
            <p><strong>Người hoàn thành:</strong> ${escapeHtml(actorName)}</p>
            <p><strong>Thời gian:</strong> ${escapeHtml(formatDate(completedAt))}</p>
        </div>
        ${actionUrl ? `<p><a href="${getFrontendUrl()}${actionUrl}">Xem task</a></p>` : ''}
    `);

    const recipients = new Set();

    if (Array.isArray(task.assignees_user_id)) {
        task.assignees_user_id.forEach((id) => addRecipient(recipients, id));
    }

    addRecipient(recipients, task.assignee_id);
    addRecipient(recipients, task.author_user_id);

    const projectOwnerId = await getProjectOwnerIdFromTask(task);
    addRecipient(recipients, projectOwnerId);

    if (!recipients.size && actorId) {
        addRecipient(recipients, actorId);
    }

    for (const recipientId of recipients) {
        const isActor = idsEqual(recipientId, actorId);

        await dispatch(
            recipientId,
            actorId,
            isActor ? 'Bạn đã hoàn thành task' : 'Task đã hoàn thành',
            isActor
                ? `Bạn đã đánh dấu hoàn thành task: ${task.title}`
                : `${actorName} đã đánh dấu hoàn thành task: ${task.title}`,
            html,
            isActor ? 'TASK_COMPLETED_BY_YOU' : 'TASK_COMPLETED',
            task._id,
            'TASK',
            actionUrl,
            metadata
        );
    }
};