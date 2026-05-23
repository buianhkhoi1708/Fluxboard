const express = require('express');
const router = express.Router();
const settingController = require('../controllers/setting.controller');
const requireAuth = require('../../auth/middlewares/requireAuth');

// Tất cả các luồng cài đặt bắt buộc phải qua xác thực token
router.use(requireAuth);

// Luồng 1: Hồ sơ và Tổ chức liên quan
router.get('/profile', settingController.getProfileOverview);
router.put('/profile', settingController.updateProfileInfo);

// Luồng 2: Bảo mật & Quản lý phiên hoạt động
router.put('/security/password', settingController.changePassword);
router.get('/security/sessions', settingController.getActiveSessions);
router.delete('/security/sessions', settingController.signOutAllSessions);
router.delete('/security/sessions/:sessionId', settingController.revokeSessionById); // Thêm nâng cao: Xóa phiên chỉ định

// Luồng 3: Cấu hình thông báo (Đồng bộ hợp đồng API của FE)
router.get('/notifications', settingController.getNotificationSettings);
router.put('/notifications', settingController.updateNotificationSettings);

// Luồng bổ sung nâng cao: Quản lý cấu hình 2FA
router.post('/security/2fa/setup', settingController.setup2FA);
router.put('/security/2fa/toggle', settingController.toggle2FA);

// Luồng bổ sung nâng cao: Nhật ký bảo mật cá nhân
router.get('/security/logs', settingController.getSecurityLogs);

module.exports = router;