const express = require('express');
const router = express.Router();
const deadlineController = require('../controllers/deadline.controller');
const requireAuth = require('../../auth/middlewares/requireAuth');

router.use(requireAuth);

// GET /api/v1/deadlines/task/:taskId - Lấy thông tin deadline
router.get('/task/:taskId', deadlineController.getDeadlineByTask);

// POST /api/v1/deadlines/task/:taskId/extend - Xin dời hạn
router.post('/task/:taskId/extend', deadlineController.requestExtension);

// PUT /api/v1/deadlines/task/:taskId/approve - Duyệt dời hạn
router.put('/task/:taskId/approve', deadlineController.approveExtension);

// PUT /api/v1/deadlines/task/:taskId/reject - Từ chối dời hạn
router.put('/task/:taskId/reject', deadlineController.rejectExtension);

module.exports = router;