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
router.get('/tree', requirePermission('ORGANIZATION', 'READ', 'SYSTEM'), organizationController.getTree);

// ==========================================
// 2. QUẢN LÝ PHÒNG BAN (DEPARTMENTS)
// ==========================================
router.post('/departments', requirePermission('ORGANIZATION', 'CREATE', 'SYSTEM'), organizationController.createDepartment);
router.put('/departments/:id', requirePermission('ORGANIZATION', 'UPDATE', 'SYSTEM'), organizationController.updateDepartment);
router.delete('/departments/:id', requirePermission('ORGANIZATION', 'DELETE', 'SYSTEM'), organizationController.deleteDepartment);

// ==========================================
// 3. QUẢN LÝ NHÓM (TEAMS)
// ==========================================
router.post('/teams', requirePermission('ORGANIZATION', 'CREATE', 'SYSTEM'), organizationController.createTeam);
router.put('/teams/:teamId', requirePermission('ORGANIZATION', 'UPDATE', 'SYSTEM'), organizationController.updateTeam);

// ==========================================
// 4. QUẢN LÝ NHÂN SỰ VÀO NHÓM (MEMBERS)
// ==========================================
// Lấy danh sách nhân sự chưa có nhóm
router.get('/users/unassigned', requirePermission('ORGANIZATION', 'READ', 'SYSTEM'), organizationController.getUnassignedUsers);

// Gán nhân sự vào nhóm
router.post('/teams/:teamId/users', requirePermission('ORGANIZATION', 'UPDATE', 'SYSTEM'), organizationController.assignToTeam);

// Gỡ nhân sự khỏi nhóm
router.delete('/teams/:teamId/users/:userId', requirePermission('ORGANIZATION', 'UPDATE', 'SYSTEM'), organizationController.removeUserFromTeam);

// Tìm kiếm nhân sự (để gán làm Leader)
router.get('/search', organizationController.searchUsers);

module.exports = router;