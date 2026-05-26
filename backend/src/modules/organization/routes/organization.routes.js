const express = require('express');
const router = express.Router();
const organizationController = require('../controllers/organization.controller');
const requireAuth = require('../../auth/middlewares/requireAuth');
const requirePermission = require('../../rbac/middlewares/requirePermission.middleware');

// Xác thực JWT token cho toàn bộ các route bên dưới
router.use(requireAuth);

// ==========================================
// 1. SƠ ĐỒ TỔ CHỨC (TREE)
// ==========================================
// 🚀 Lấy sơ đồ tổ chức thì dùng quyền xem Phòng ban là chuẩn nhất
router.get('/tree', requirePermission('DEPARTMENT', 'READ', 'SYSTEM'), organizationController.getTree);

// ==========================================
// 2. QUẢN LÝ PHÒNG BAN (DEPARTMENTS)
// ==========================================
// 🚀 Trả lại tên cho em: DEPARTMENT
router.post('/departments', requirePermission('DEPARTMENT', 'CREATE', 'SYSTEM'), organizationController.createDepartment);
router.put('/departments/:id', requirePermission('DEPARTMENT', 'UPDATE', 'SYSTEM'), organizationController.updateDepartment);
router.delete('/departments/:id', requirePermission('DEPARTMENT', 'DELETE', 'SYSTEM'), organizationController.deleteDepartment);

// ==========================================
// 3. QUẢN LÝ NHÓM (TEAMS)
// ==========================================
// 🚀 Làm việc với nhóm thì phải gọi tài nguyên TEAM
router.post('/teams', requirePermission('TEAM', 'CREATE', 'SYSTEM'), organizationController.createTeam);
router.put('/teams/:teamId', requirePermission('TEAM', 'UPDATE', 'SYSTEM'), organizationController.updateTeam);

// ==========================================
// 4. QUẢN LÝ NHÂN SỰ VÀO NHÓM (MEMBERS)
// ==========================================
// 🚀 Đọc danh sách nhân sự chưa có nhóm -> Dùng quyền xem USER
router.get('/users/unassigned', requirePermission('USER', 'READ', 'SYSTEM'), organizationController.getUnassignedUsers);

// 🚀 Thêm/bớt người vào Team bản chất là đang sửa data của Team -> Dùng TEAM UPDATE
router.post('/teams/:teamId/users', requirePermission('TEAM', 'UPDATE', 'SYSTEM'), organizationController.assignToTeam);
router.delete('/teams/:teamId/users/:userId', requirePermission('TEAM', 'UPDATE', 'SYSTEM'), organizationController.removeUserFromTeam);

// 🚀 Tìm kiếm user để gán Leader -> Dùng quyền xem USER
router.get('/search', requirePermission('USER', 'READ', 'SYSTEM'), organizationController.searchUsers);

module.exports = router;