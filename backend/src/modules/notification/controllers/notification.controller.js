const notificationService = require("../services/notification.service");
const eventBus = require("../../../common/utils/eventBus");

const getAuthUserId = (req) => {
  return req.user?.id || req.user?._id;
};

exports.getMyNotifications = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit, 10) || 20, 1);

    const userId = getAuthUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const notifications = await notificationService.getUserNotifications(
      userId,
      page,
      limit,
    );

    res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const userId = getAuthUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const notification = await notificationService.markAsRead(
      req.params.id,
      userId,
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.status(200).json({
      success: true,
      data: notification,
      message: "Notification marked as read",
    });
  } catch (error) {
    next(error);
  }
};

exports.longPollingNotifications = (req, res, next) => {
  try {
    const userId = getAuthUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const userIdString = userId.toString();
    const timeoutMs = 30000;
    const userEventName = `new_notification_for_${userIdString}`;

    const collectedNotifications = [];
    let finished = false;

    const cleanup = () => {
      clearTimeout(timeoutId);
      eventBus.removeListener(userEventName, onNewNotification);
    };

    const finish = (payload) => {
      if (finished || res.headersSent) return;

      finished = true;
      cleanup();

      res.status(200).json(payload);
    };

    const timeoutId = setTimeout(() => {
      finish({
        success: true,
        data: collectedNotifications,
        message: "Polling cycle completed",
      });
    }, timeoutMs);

    const onNewNotification = (notification) => {
      if (!notification) return;

      collectedNotifications.push(notification);

      setImmediate(() => {
        finish({
          success: true,
          data: collectedNotifications,
          message: "New notifications retrieved successfully",
        });
      });
    };

    eventBus.on(userEventName, onNewNotification);

    req.on("close", () => {
      if (!finished) {
        finished = true;
        cleanup();
      }
    });
  } catch (error) {
    next(error);
  }
};
