const notificationService = require('../services/notification.service');
const eventBus = require('../../../common/utils/eventBus');

exports.getMyNotifications = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const notifications = await notificationService.getUserNotifications(req.user.id, page, limit);
        
        res.status(200).json({ success: true, data: notifications });
    } catch (error) { next(error); }
};

exports.markAsRead = async (req, res, next) => {
    try {
        const notification = await notificationService.markAsRead(req.params.id, req.user.id);
        res.status(200).json({ success: true, data: notification, message: 'Notification marked as read' });
    } catch (error) { next(error); }
};

// ==========================================
// API LONG POLLING (Chờ 30s)
// ==========================================
exports.longPollingNotifications = (req, res, next) => {
    const userId = req.user.id;
    const timeout_ms = 30000; // Treo request tối đa 30 giây

    // Tạo kênh phát sóng dành riêng cho user này
    const userEventName = `new_notification_for_${userId}`;

    // 1. Timeout: Xử lý khi hết 30s mà không có thông báo
    const timeoutId = setTimeout(() => {
        eventBus.removeListener(userEventName, onNewNotification);
        return res.status(200).json({ success: true, data: [], message: 'Timeout: No new notifications' });
    }, timeout_ms);

    // 2. Thành công: Xử lý khi có thông báo mới
    const onNewNotification = (notification) => {
        clearTimeout(timeoutId); 
        return res.status(200).json({ success: true, data: [notification], message: 'New notification arrived!' });
    };

    // Đăng ký nghe trên kênh của user (Dùng once để nghe 1 lần rồi tự hủy)
    eventBus.once(userEventName, onNewNotification);

    // 3. Đứt kết nối: Xử lý khi user tắt web giữa chừng (Hủy listener rác)
    req.on('close', () => {
        clearTimeout(timeoutId);
        eventBus.removeListener(userEventName, onNewNotification);
    });
};