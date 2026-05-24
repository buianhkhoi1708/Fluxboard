const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const requireAuth = require('../../auth/middlewares/requireAuth');

const requirePermissionModule = require('../../rbac/middlewares/requirePermission.middleware');
const requirePermission = typeof requirePermissionModule === 'function' 
    ? requirePermissionModule 
    : requirePermissionModule.requirePermission;

// Tất cả các tuyến đường quản lý tài khoản bắt buộc phải được xác thực token
router.use(requireAuth);
router.get('/', userController.getAllUsers);


// ==========================================
// ĐỊNH TUYẾN QUẢN TRỊ TỔ CHỨC & HỆ THỐNG
// ==========================================
// Tuyến đường tĩnh phải đặt lên trước tham số động để tránh nhận diện nhầm id
router.get('/unassigned', requirePermission('ORGANIZATION', 'READ'), userController.getUnassignedUsers);

router.get('/:id', userController.getUserById);
router.post('/', requirePermission('SYSTEM', 'WRITE', 'SYSTEM'), userController.createUser);

// Sửa lại định tuyến đồng bộ với tham số req.params.id của Controller theo cấu trúc tài liệu thiết kế
router.put('/:id/assign-team', requirePermission('ORGANIZATION', 'WRITE'), userController.assignToTeam);
router.put('/:id/revoke', requirePermission('SYSTEM', 'WRITE', 'SYSTEM'), userController.revokeAccess);

module.exports = router;