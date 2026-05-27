const cron = require('node-cron');

const TaskDeadline = require('../models/taskDeadline.model');
const User = require('../../user/models/user.model');
const Notification = require('../../notification/models/notification.model');
const UserNotificationPref = require('../../user/models/userNotificationPref.model');

const deadlineService = require('../services/deadline.service');
const notificationService = require('../../notification/services/notification.service');
const notificationDispatcher = require('../../notification/services/notificationDispatcher.service');
const socketConfig = require('../../../common/config/socket');
const eventBus = require('../../../common/utils/eventBus');

const DEADLINE_CRON_SCHEDULE =
    process.env.DEADLINE_CRON_SCHEDULE || '*/5 * * * *';

const REMINDER_WINDOW_HOURS =
    Number(process.env.DEADLINE_REMINDER_WINDOW_HOURS || 24);

const normalizeDate = (value) => {
    if (!value) return null;

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date;
};

const toIdString = (value) => {
    if (!value) return null;

    if (typeof value === 'object' && value._id) {
        return value._id.toString();
    }

    if (typeof value === 'object' && value.id) {
        return value.id.toString();
    }

    if (typeof value === 'object' && value.user_id) {
        return value.user_id.toString();
    }

    return value.toString();
};

const formatDate = (value) => {
    const date = normalizeDate(value);

    if (!date) return 'Không rõ';

    return date.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
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

const getNotificationPrefs = async (userId) => {
    const prefs = await UserNotificationPref.findOne({
        user_id: userId.toString(),
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
            true,
    };
};

const getTaskActionUrl = (task) => {
    if (!task || !task.board_id || !task._id) return null;

    return `/board/${task.board_id}?taskId=${task._id}`;
};

const collectTaskRecipients = (task) => {
    const recipients = new Set();

    if (Array.isArray(task?.assignees_user_id)) {
        task.assignees_user_id.forEach((id) => {
            const normalizedId = toIdString(id);

            if (normalizedId) {
                recipients.add(normalizedId);
            }
        });
    }

    const legacyAssigneeId = toIdString(task?.assignee_id);

    if (legacyAssigneeId) {
        recipients.add(legacyAssigneeId);
    }

    const authorId = toIdString(task?.author_user_id);

    if (recipients.size === 0 && authorId) {
        recipients.add(authorId);
    }

    return Array.from(recipients);
};

const buildReminderEmailHtml = (user, task, deadline) => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const actionUrl = getTaskActionUrl(task);
    const fullActionUrl = actionUrl ? `${frontendUrl}${actionUrl}` : frontendUrl;

    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
            <div style="background-color: #f97316; padding: 24px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">Nhắc hạn công việc</h1>
            </div>

            <div style="padding: 30px; background-color: #ffffff;">
                <h2 style="color: #111827;">Xin chào ${escapeHtml(user.full_name || user.email || 'bạn')},</h2>

                <p style="color: #4b5563; line-height: 1.6;">
                    Công việc của bạn sắp đến hạn trong vòng ${REMINDER_WINDOW_HOURS} giờ tới. Vui lòng kiểm tra và hoàn thành đúng thời gian.
                </p>

                <div style="background-color: #fff7ed; padding: 16px; border-left: 4px solid #f97316; margin: 20px 0; border-radius: 8px;">
                    <p style="margin: 0; color: #9a3412;">
                        <strong>Công việc:</strong> ${escapeHtml(task.title || 'Không rõ công việc')}
                    </p>

                    <p style="margin: 10px 0 0 0; color: #c2410c;">
                        <strong>Hạn chót:</strong> ${escapeHtml(formatDate(deadline.due_date))}
                    </p>
                </div>

                <div style="text-align: center; margin-top: 30px;">
                    <a href="${fullActionUrl}" style="background-color: #f97316; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                        Xem công việc
                    </a>
                </div>
            </div>

            <div style="background-color: #f9fafb; padding: 18px; text-align: center; font-size: 13px; color: #6b7280; border-top: 1px solid #e5e7eb;">
                Đây là email tự động từ hệ thống FluxBoard. Vui lòng không trả lời email này.
            </div>
        </div>
    `;
};

const emitRealtimeNotification = (recipientId, notification) => {
    if (!recipientId || !notification) return;

    const notifToClient =
        typeof notification.toObject === 'function'
            ? notification.toObject()
            : { ...notification };

    delete notifToClient.email_html;

    eventBus.emit(
        `new_notification_for_${recipientId.toString()}`,
        notifToClient,
    );

    const io = socketConfig.getIo();

    if (io) {
        io.to(recipientId.toString()).emit('newNotification', notifToClient);
    }
};

const dispatchDeadlineReminder = async (recipientId, task, deadline) => {
    if (!recipientId || !task || !deadline) return null;

    const user = await User.findById(recipientId)
        .select('_id email full_name')
        .lean();

    if (!user) return null;

    const prefs = await getNotificationPrefs(user._id);

    if (!prefs.deadlineReminderEnabled) {
        return null;
    }

    const actionUrl = getTaskActionUrl(task);

    const notificationPayload = {
        recipient_id: user._id,
        sender_id: null,
        title: 'Công việc sắp hết hạn',
        message: `Task "${task.title}" sẽ hết hạn trong vòng ${REMINDER_WINDOW_HOURS} giờ tới.`,
        type: 'TASK_DEADLINE_REMINDER',
        reference_id: task._id,
        reference_type: 'TASK',
        action_url: actionUrl,
        metadata: {
            task_id: task._id ? task._id.toString() : null,
            board_id: task.board_id ? task.board_id.toString() : null,
            task_title: task.title || 'Không rõ task',
            due_date: deadline.due_date || null,
            reminder_window_hours: REMINDER_WINDOW_HOURS,
        },
    };

    let notification = null;

    if (prefs.emailEnabled && user.email) {
        notification = await notificationService.queueNotification({
            ...notificationPayload,
            email_html: buildReminderEmailHtml(user, task, deadline),
            email_delay_minutes: 0,
            emit_realtime: false,
        });
    } else {
        notification = await Notification.create({
            ...notificationPayload,
            status: 'SENT',
        });
    }

    if (prefs.inAppEnabled && notification) {
        emitRealtimeNotification(user._id, notification);
    }

    /**
     * Giữ lại socket event cũ để không làm gãy FE cũ nếu có nơi đang nghe deadlineAlert.
     * Notification chính vẫn là newNotification ở trên.
     */
    if (prefs.inAppEnabled) {
        const io = socketConfig.getIo();

        if (io) {
            io.to(user._id.toString()).emit('deadlineAlert', {
                task_id: task._id,
                board_id: task.board_id,
                title: task.title,
                message: `Task "${task.title}" sắp hết hạn.`,
                action_url: actionUrl,
                due_date: deadline.due_date,
            });
        }
    }

    return notification;
};

const processUpcomingDeadline = async (deadline) => {
    const task = deadline.task_id;

    if (!task) return false;

    const recipients = collectTaskRecipients(task);

    if (recipients.length === 0) {
        return false;
    }

    for (const recipientId of recipients) {
        try {
            await dispatchDeadlineReminder(recipientId, task, deadline);
        } catch (error) {
            console.error(
                `[Deadline Cron] Failed to send 24h reminder for task ${task._id} to user ${recipientId}:`,
                error,
            );
        }
    }

    await TaskDeadline.findByIdAndUpdate(deadline._id, {
        $set: {
            reminder_sent: true,
        },
    });

    return true;
};

const processOverdueDeadline = async (deadline) => {
    const task = deadline.task_id;

    if (!task) return false;

    const recipients = collectTaskRecipients(task);

    await TaskDeadline.findByIdAndUpdate(deadline._id, {
        $set: {
            is_overdue: true,
        },
    });

    if (recipients.length === 0) {
        return false;
    }

    for (const recipientId of recipients) {
        try {
            await notificationDispatcher.dispatchTaskOverdue(
                recipientId,
                task,
                deadline,
            );
        } catch (error) {
            console.error(
                `[Deadline Cron] Failed to send overdue notification for task ${task._id} to user ${recipientId}:`,
                error,
            );
        }
    }

    return true;
};

const scheduleTaskDeadlineCheck = () => {
    cron.schedule(DEADLINE_CRON_SCHEDULE, async () => {
        console.log('--- [CRON JOB] Starting Task Deadline Check ---');

        try {
            const now = new Date();
            const reminderWindowEnd = new Date(
                now.getTime() + REMINDER_WINDOW_HOURS * 60 * 60 * 1000,
            );

            /**
             * 1. Nhắc deadline trước 24h.
             *
             * Chạy mỗi 5 phút để task vừa bước vào cửa sổ 24h sẽ được bắt gần như ngay.
             * reminder_sent=true để không spam.
             */
            const upcomingDeadlines = await TaskDeadline.find({
                due_date: {
                    $gte: now,
                    $lte: reminderWindowEnd,
                },
                actual_completed_at: null,
                reminder_sent: false,
                is_deleted: {
                    $ne: true,
                },
            })
                .populate('task_id')
                .lean();

            for (const deadline of upcomingDeadlines) {
                await processUpcomingDeadline(deadline);
            }

            /**
             * 2. Trễ hạn.
             *
             * Lỗi cũ là $llt nên MongoDB không hiểu đúng operator.
             * Phải là $lt.
             */
            const freshOverdueDeadlines = await TaskDeadline.find({
                due_date: {
                    $lt: now,
                },
                actual_completed_at: null,
                is_overdue: false,
                is_deleted: {
                    $ne: true,
                },
            })
                .populate('task_id')
                .lean();

            for (const deadline of freshOverdueDeadlines) {
                await processOverdueDeadline(deadline);
            }

            console.log(
                `--- [CRON JOB] Finished Task Deadline Check | reminders=${upcomingDeadlines.length}, overdue=${freshOverdueDeadlines.length} ---`,
            );
        } catch (error) {
            console.error('[CRON JOB Error] Failed to check task deadlines:', error);
        }
    });
};

module.exports = scheduleTaskDeadlineCheck;