const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const requireAuth = require('../../auth/middlewares/requireAuth');
const requirePermission = require('../../rbac/middlewares/requirePermission.middleware');

router.use(requireAuth);

// Thuật toán giới hạn tần suất (Rate Limiter) chặn spam API Gemini
const rateLimits = new Map();
const aiRateLimiter = (req, res, next) => {
    const userId = req.user.id;
    const now = Date.now();
    const windowMs = 60 * 1000; 
    const limit = 5; 

    if (!rateLimits.has(userId)) rateLimits.set(userId, []);
    const requests = rateLimits.get(userId).filter(time => now - time < windowMs);
    
    if (requests.length >= limit) {
        return res.status(429).json({ 
            success: false, 
            message: 'Vượt quá giới hạn 5 yêu cầu/phút. Vui lòng đợi và thử lại sau.' 
        });
    }
    
    requests.push(now);
    rateLimits.set(userId, requests);
    next();
};

router.use(aiRateLimiter);

// ==========================================
// 🤖 CÁC API TÍCH HỢP AI GEMINI
// ==========================================

// 🚀 Tạo Task thông minh vào Board: Dùng quyền UPDATE BOARD ở scope PROJECT
router.post('/generate-board', requirePermission('BOARD', 'UPDATE', 'PROJECT'), aiController.generateSmartTasks);

// 🚀 Lấy Insight rủi ro dự án (Deviation): Dùng quyền READ PROJECT ở scope PROJECT
router.get('/deviation/:projectId', requirePermission('PROJECT', 'READ', 'PROJECT'), aiController.getDeviationInsights);

// 🚀 Sinh báo cáo Insight chung: Dùng quyền READ PROJECT
router.post('/insights', requirePermission('PROJECT', 'READ', 'PROJECT'), aiController.generateInsights);

// 🚀 AI bẻ nhỏ Task (Subtasks): Dùng quyền CREATE TASK ở scope PROJECT
router.post('/generate-subtasks', requirePermission('TASK', 'CREATE', 'PROJECT'), aiController.generateSubtasks);

// 🚀 Tóm tắt hoạt động của 1 Task: Dùng quyền READ TASK ở scope PROJECT
router.get('/summarize-task/:taskId', requirePermission('TASK', 'READ', 'PROJECT'), aiController.summarizeTaskActivity);

module.exports = router;