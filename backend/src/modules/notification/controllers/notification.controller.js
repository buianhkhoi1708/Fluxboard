const notificationService = require('../services/notification.service');

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