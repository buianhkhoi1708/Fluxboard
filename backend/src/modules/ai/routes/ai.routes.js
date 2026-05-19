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

router.post('/generate-board', requirePermission('AI_BOARD', 'WRITE', 'SYSTEM'), aiController.generateBoard);
router.post('/insights', requirePermission('AI_INSIGHT', 'READ', 'SYSTEM'), aiController.generateInsights);
router.post('/generate-subtasks', requirePermission('AI_BOARD', 'WRITE', 'SYSTEM'), aiController.generateSubtasks);
router.get('/summarize-task/:taskId', requirePermission('AI_INSIGHT', 'READ', 'SYSTEM'), aiController.summarizeTaskActivity);

module.exports = router;