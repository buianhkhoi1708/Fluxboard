const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const requireAuth = require('../../auth/middlewares/requireAuth');

// Xử lý nạp middleware an toàn để bóc tách cả dạng hàm mặc định hoặc thuộc tính của object (phòng chống lỗi import/export hoặc vòng lặp modules)
const requirePermissionModule = require('../../rbac/middlewares/requirePermission.middleware');
const requirePermission = typeof requirePermissionModule === 'function' 
    ? requirePermissionModule 
    : requirePermissionModule.requirePermission;

router.use(requireAuth);

// ==========================================
// API DỮ LIỆU CÁ NHÂN (ME)
// ==========================================
router.get('/me', userController.getCurrentProfile);
router.put('/me', userController.updateProfile);
router.put('/me/password', userController.changePassword);

router.get('/me/preferences', userController.getPreferences);
router.put('/me/preferences', userController.updatePreferences);

// ==========================================
// API TỔ CHỨC & HỆ THỐNG
// ==========================================
// Chú ý: /unassigned phải nằm trên /:id để tránh bị nhận nhầm làm tham số cấu hình id
router.get('/unassigned', requirePermission('ORGANIZATION', 'READ'), userController.getUnassignedUsers);

router.get('/:id', userController.getUserById);
router.put('/:id/assign-team', requirePermission('ORGANIZATION', 'WRITE'), userController.assignToTeam);

module.exports = router;