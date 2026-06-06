const Notification = require("../models/notification.model");
const UserNotificationPref = require("../../user/models/userNotificationPref.model");
const emailService = require("../../email/services/email.service");
const eventBus = require("../../../common/utils/eventBus");

const DEADLINE_REMINDER_TYPES = new Set([
  "TASK_OVERDUE",
  "TASK_DEADLINE_REMINDER",
  "DEADLINE_REMINDER",
]);

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
  const { email_delay_minutes, emit_realtime, ...dataToSave } = data;

  return dataToSave;
};

const getPrefs = async (userId) => {
  const prefs = await UserNotificationPref.findOne({
    user_id: userId.toString(),
  }).lean();

  return {
    emailEnabled:
      prefs?.email_notifications_enabled ?? prefs?.email_notifications ?? true,

    pushEnabled:
      prefs?.in_app_notifications_enabled ?? prefs?.push_notifications ?? true,

    deadlineReminderEnabled: prefs?.task_deadline_reminders ?? true,
  };
};

const emitNotificationToLongPolling = (notification) => {
  if (!notification) return;

  const notifToClient =
    typeof notification.toObject === "function"
      ? notification.toObject()
      : { ...notification };

  delete notifToClient.email_html;

  if (!notifToClient.recipient_id) return;

  eventBus.emit(
    `new_notification_for_${notifToClient.recipient_id.toString()}`,
    notifToClient,
  );
};

// ==========================================
// 1. QUEUE NOTIFICATION
// ==========================================
exports.queueNotification = async (data) => {
  try {
    const delayMinutes = getDelayMinutes(data.email_delay_minutes);
    const sendTime = buildSendTime(delayMinutes);
    const dataToSave = sanitizeNotificationData(data);
    const shouldEmitRealtime = data.emit_realtime !== false;

    const existingNotif = await Notification.findOne({
      recipient_id: data.recipient_id,
      reference_id: data.reference_id,
      type: data.type,
      status: "PENDING",
    });

    if (existingNotif) {
      existingNotif.send_at = sendTime;
      existingNotif.sender_id = dataToSave.sender_id || null;
      existingNotif.title = dataToSave.title;
      existingNotif.message = dataToSave.message;
      existingNotif.type = dataToSave.type;
      existingNotif.reference_id = dataToSave.reference_id || null;
      existingNotif.reference_type = dataToSave.reference_type || "TASK";
      existingNotif.action_url = dataToSave.action_url || null;
      existingNotif.metadata = dataToSave.metadata || {};
      existingNotif.email_html = dataToSave.email_html;
      existingNotif.is_read = false;

      await existingNotif.save();

      if (shouldEmitRealtime) {
        emitNotificationToLongPolling(existingNotif);
      }

      return existingNotif;
    }

    const newNotif = await Notification.create({
      ...dataToSave,
      status: "PENDING",
      send_at: sendTime,
    });

    if (shouldEmitRealtime) {
      emitNotificationToLongPolling(newNotif);
    }

    return newNotif;
  } catch (error) {
    console.error("Error queuing notification:", error);
    return null;
  }
};

// ==========================================
// 2. EXECUTE SENDING EMAIL
// ==========================================
exports.executePendingNotification = async (notificationId) => {
  try {
    const notif = await Notification.findById(notificationId)
      .populate("recipient_id", "email full_name")
      .exec();

    if (!notif || notif.status === "SENT") {
      return null;
    }

    if (!notif.recipient_id) {
      notif.status = "SENT";
      await notif.save();
      return notif;
    }

    const recipientId = notif.recipient_id._id || notif.recipient_id;
    const prefs = await getPrefs(recipientId);

    if (!prefs.emailEnabled) {
      notif.status = "SENT";
      await notif.save();
      return notif;
    }

    if (
      DEADLINE_REMINDER_TYPES.has(notif.type) &&
      !prefs.deadlineReminderEnabled
    ) {
      notif.status = "SENT";
      await notif.save();
      return notif;
    }

    const recipientEmail = notif.recipient_id.email;

    if (!recipientEmail) {
      notif.status = "SENT";
      await notif.save();
      return notif;
    }

    const subject = `[FluxBoard] ${notif.title}`;

    const html =
      notif.email_html ||
      `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #4F46E5; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Thông báo từ FluxBoard</h1>
        </div>

        <div style="padding: 30px; background-color: #ffffff; color: #333;">
            <h2 style="color: #111827; margin-top: 0;">Xin chào ${notif.recipient_id.full_name || notif.recipient_id.email},</h2>
            <p style="font-size: 16px; line-height: 1.6; color: #4b5563;">${notif.message}</p>
        </div>

        <div style="background-color: #f9fafb; padding: 18px; text-align: center; font-size: 13px; color: #6b7280; border-top: 1px solid #e5e7eb;">
            Đây là email tự động từ hệ thống FluxBoard. Vui lòng không trả lời email này.
        </div>
    </div>`;

    await emailService.sendEmail(recipientEmail, subject, html);

    notif.status = "SENT";
    await notif.save();

    return notif;
  } catch (error) {
    console.error("Error executing pending notification:", error);
    return null;
  }
};

// ==========================================

exports.getUserNotifications = async (userId, page = 1, limit = 20) => {
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.max(Number(limit) || 20, 1);
  const skip = (safePage - 1) * safeLimit;

  return await Notification.find({ recipient_id: userId })
    .select("-email_html")
    .populate("sender_id", "full_name avatar_url email")
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(safeLimit)
    .lean();
};

exports.markAsRead = async (notificationId, userId) => {
  return await Notification.findOneAndUpdate(
    {
      _id: notificationId,
      recipient_id: userId,
    },
    {
      is_read: true,
    },
    {
      returnDocument: "after",
    },
  ).select("-email_html");
};
