const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activity.controller');
const requireAuth = require('../../auth/middlewares/requireAuth');

router.use(requireAuth);

// 🚀 THÊM ROUTE NÀY: Dành cho Admin lấy TOÀN BỘ log hệ thống (axiosClient.get('/activities'))
router.get('/', activityController.getAllActivities);

// Route cũ của Sếp: Dành cho từng dự án cụ thể
router.get('/projects/:projectId', activityController.getProjectActivities);

module.exports = router;