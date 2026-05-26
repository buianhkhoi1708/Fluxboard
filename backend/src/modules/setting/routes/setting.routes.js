const express = require('express');
const router = express.Router();

const settingController = require('../controllers/setting.controller');
const requireAuth = require('../../auth/middlewares/requireAuth');

router.use(requireAuth);

// Hồ sơ
router.get('/profile', settingController.getProfileOverview);
router.put('/profile', settingController.updateProfileInfo);

// Bảo mật & phiên đăng nhập
router.put('/security/password', settingController.changePassword);
router.get('/security/sessions', settingController.getActiveSessions);
router.delete('/security/sessions', settingController.signOutAllSessions);
router.delete('/security/sessions/:sessionId', settingController.revokeSessionById);

// Cấu hình thông báo
router.get('/notifications', settingController.getNotificationSettings);
router.put('/notifications', settingController.updateNotificationSettings);

// 2FA
router.post('/security/2fa/setup', settingController.setup2FA);
router.put('/security/2fa/toggle', settingController.toggle2FA);

// Nhật ký bảo mật
router.get('/security/logs', settingController.getSecurityLogs);

module.exports = router;