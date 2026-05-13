const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const requireAuth = require('../../auth/middlewares/requireAuth');

// Chặn Auth để lấy Token và kiểm tra Blacklist Redis
router.use(requireAuth);

// Hợp đồng API: GET /api/v1/dashboard/metrics
router.get('/metrics', dashboardController.getDashboardMetrics);

module.exports = router;