const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/department.controller');
const teamController = require('../controllers/team.controller');
const requireAuth = require('../../auth/middlewares/requireAuth');
const requirePermission = require('../../rbac/middlewares/requirePermission.middleware');

router.use(requireAuth);

// =================== API FOR DEPARTMENTS ===================
// Lấy danh sách phòng ban (Cần quyền đọc Organization)
router.get('/departments', requirePermission('ORGANIZATION', 'READ'), departmentController.getAllDepartments);
// Tạo phòng ban (Cần quyền ghi Organization)
router.post('/departments', requirePermission('ORGANIZATION', 'WRITE'), departmentController.createDepartment);

// =================== API FOR TEAMS ===================
// Lấy danh sách team trong 1 phòng ban
router.get('/departments/:departmentId/teams', requirePermission('ORGANIZATION', 'READ'), teamController.getTeamsByDepartment);
// Tạo team
router.post('/teams', requirePermission('ORGANIZATION', 'WRITE'), teamController.createTeam);

module.exports = router;