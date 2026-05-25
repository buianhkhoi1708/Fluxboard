const notificationService = require('../services/notification.service');
const eventBus = require('../../../common/utils/eventBus');

exports.getMyNotifications = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const userId = req.user.id || req.user._id; // Đảm bảo lấy đúng định danh không phụ thuộc cấu hình middleware
        const notifications = await notificationService.getUserNotifications(userId, page, limit);
        
        res.status(200).json({ success: true, data: notifications });
    } catch (error) { next(error); }
};

exports.markAsRead = async (req, res, next) => {
    try {
        const userId = req.user.id || req.user._id;
        const notification = await notificationService.markAsRead(req.params.id, userId);
        res.status(200).json({ success: true, data: notification, message: 'Notification marked as read' });
    } catch (error) { next(error); }
};

// ==========================================
// API LONG POLLING (Chờ 30s)
// ==========================================
exports.longPollingNotifications = (req, res, next) => {
    const userId = req.user.id || req.user._id; // Đảm bảo đồng bộ định danh kênh sự kiện
    const timeout_ms = 30000; 
    const userEventName = `new_notification_for_${userId}`;
    
    let collectedNotifications = [];

    const timeoutId = setTimeout(() => {
        eventBus.removeListener(userEventName, onNewNotification);
        return res.status(200).json({ 
            success: true, 
            data: collectedNotifications, 
            message: 'Polling cycle completed' 
        });
    }, timeout_ms);

    const onNewNotification = (notification) => {
        collectedNotifications.push(notification);
        
        setImmediate(() => {
            clearTimeout(timeoutId);
            eventBus.removeListener(userEventName, onNewNotification);
            
            if (!res.headersSent) {
                return res.status(200).json({ 
                    success: true, 
                    data: collectedNotifications, 
                    message: 'New notifications retrieved successfully' 
                });
            }
        });
    };

    eventBus.on(userEventName, onNewNotification);

    req.on('close', () => {
        clearTimeout(timeoutId);
        eventBus.removeListener(userEventName, onNewNotification);
    });
};