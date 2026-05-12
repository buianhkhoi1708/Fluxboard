const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const requireAuth = require('../../auth/middlewares/requireAuth');

// Mọi request vào notification đều phải có Token đăng nhập
router.use(requireAuth);

// Lấy danh sách thông báo của người dùng hiện tại
router.get('/', notificationController.getMyNotifications);

// Đánh dấu 1 thông báo là đã đọc
router.patch('/:id/read', notificationController.markAsRead);

module.exports = router;