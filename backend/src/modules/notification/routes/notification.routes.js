const express = require('express');
const router = express.Router();

const notificationController = require('../controllers/notification.controller');
const requireAuth = require('../../auth/middlewares/requireAuth');

router.use(requireAuth);

// Lấy lịch sử thông báo của user hiện tại
router.get('/', notificationController.getMyNotifications);

// Long polling để FE nhận notification realtime
router.get('/long-polling', notificationController.longPollingNotifications);

// Đánh dấu một notification đã đọc
router.patch('/:id/read', notificationController.markAsRead);

module.exports = router;