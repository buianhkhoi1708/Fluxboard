const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');
const projectMemberController = require('../controllers/projectMember.controller');
const requireAuth = require('../../auth/middlewares/requireAuth');
// Import middleware phân quyền mới
const requirePermission = require('../../../common/middlewares/requirePermission'); 

// Mọi request vào Project đều phải có Token hợp lệ[cite: 9]
router.use(requireAuth);

// --- CẤP ĐỘ HỆ THỐNG (SYSTEM SCOPE) ---
// Chỉ người có quyền CREATE PROJECT (trên toàn hệ thống) mới được tạo[cite: 9]
router.post('/', requirePermission('PROJECT', 'CREATE', 'SYSTEM'), projectController.createProject);

// Xem danh sách dự án của mình thì không cần RBAC phức tạp (chỉ cần lấy theo user_id)[cite: 9]
router.get('/', projectController.getUserProjects);

// --- CẤP ĐỘ DỰ ÁN (PROJECT SCOPE) ---
// Xem chi tiết dự án: Phải có quyền READ PROJECT bên trong dự án đó[cite: 9]
router.get('/:id', requirePermission('PROJECT', 'READ', 'PROJECT'), projectController.getProjectDetail);

// Sửa dự án: Phải có quyền UPDATE PROJECT (VD: PROJECT_ADMIN, PM)[cite: 9]
router.put('/:id', requirePermission('PROJECT', 'UPDATE', 'PROJECT'), projectController.updateProject);

// Xóa dự án: Cần quyền DELETE PROJECT (Thường chỉ dành cho PROJECT_ADMIN)[cite: 9]
router.delete('/:id', requirePermission('PROJECT', 'DELETE', 'PROJECT'), projectController.deleteProject);

// --- QUẢN LÝ THÀNH VIÊN DỰ ÁN ---
// Chỉ người có quyền MANAGE_MEMBERS mới được mời, sửa, xóa thành viên[cite: 9]
router.post('/members', requirePermission('PROJECT', 'MANAGE_MEMBERS', 'PROJECT'), projectMemberController.addMember);
router.delete('/members', requirePermission('PROJECT', 'MANAGE_MEMBERS', 'PROJECT'), projectMemberController.removeMember);
router.put('/:projectId/members/:userId', requirePermission('PROJECT', 'MANAGE_MEMBERS', 'PROJECT'), projectMemberController.updateMemberRole);

module.exports = router;