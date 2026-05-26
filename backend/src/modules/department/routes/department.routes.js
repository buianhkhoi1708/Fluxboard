const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/department.controller');
const teamController = require('../../team/controllers/team.controller'); 

const requireAuth = require('../../auth/middlewares/requireAuth');
const requirePermission = require('../../rbac/middlewares/requirePermission.middleware');

router.use(requireAuth);

// 🚀 Sửa 'ORGANIZATION' -> 'DEPARTMENT' | Thêm scope 'SYSTEM' cho chắc chắn
router.get('/', requirePermission('DEPARTMENT', 'READ', 'SYSTEM'), departmentController.getAllDepartments);

// 🚀 Sửa 'WRITE' -> 'CREATE' cho khớp từ điển RBAC
router.post('/', requirePermission('DEPARTMENT', 'CREATE', 'SYSTEM'), departmentController.createDepartment);

// 🚀 Sửa 'ORGANIZATION' -> 'DEPARTMENT' (Lấy danh sách team trong phòng ban thì vẫn cần quyền đọc phòng ban)
router.get('/:departmentId/teams', requirePermission('DEPARTMENT', 'READ', 'SYSTEM'), teamController.getTeamsByDepartment);

module.exports = router;