const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const requireAuth = require('../../auth/middlewares/requireAuth');

router.use(requireAuth);

router.get('/', notificationController.getMyNotifications);

router.get('/long-polling', notificationController.longPollingNotifications);

router.patch('/:id/read', notificationController.markAsRead);

module.exports = router;