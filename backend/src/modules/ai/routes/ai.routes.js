const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const requireAuth = require('../../auth/middlewares/requireAuth');
const requirePermission = require('../../rbac/middlewares/requirePermission.middleware');

router.use(requireAuth);

// API sinh Task tự động
router.post('/generate-board', requirePermission('AI_BOARD', 'WRITE', 'SYSTEM'), aiController.generateBoard);

// 💡 Thêm API đánh giá rủi ro dự án (Còn thiếu trong code cũ)
router.post('/insights', requirePermission('AI_INSIGHT', 'READ', 'SYSTEM'), aiController.generateInsights);

module.exports = router;