const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');
const projectMemberController = require('../controllers/projectMember.controller');
const requireAuth = require('../../auth/middlewares/requireAuth');
// Import middleware phân quyền mới
const requirePermission = require('../../../common/middlewares/requirePermission'); 

// Mọi request vào Project đều phải có Token hợp lệ
router.use(requireAuth);

// ==========================================
// --- CẤP ĐỘ HỆ THỐNG (SYSTEM SCOPE) ---
// ==========================================

// Chỉ người có quyền CREATE PROJECT (trên toàn hệ thống) mới được tạo
router.post('/', requirePermission('PROJECT', 'CREATE', 'SYSTEM'), projectController.createProject);

// Xem danh sách dự án của mình thì không cần RBAC phức tạp (chỉ cần lấy theo user_id)
router.get('/', projectController.getUserProjects);

// ==========================================
// --- QUẢN LÝ THÀNH VIÊN DỰ ÁN ---
// LƯU Ý: Các đường dẫn tĩnh (static routes) như /members phải được đặt 
// TRƯỚC các đường dẫn động (dynamic routes) như /:id để tránh xung đột.
// ==========================================

// Chỉ người có quyền MANAGE_MEMBERS mới được mời, sửa, xóa thành viên
router.post('/members', requirePermission('PROJECT', 'MANAGE_MEMBERS', 'PROJECT'), projectMemberController.addMember);
router.delete('/members', requirePermission('PROJECT', 'MANAGE_MEMBERS', 'PROJECT'), projectMemberController.removeMember);
router.put('/:projectId/members/:userId', requirePermission('PROJECT', 'MANAGE_MEMBERS', 'PROJECT'), projectMemberController.updateMemberRole);

// ==========================================
// --- CẤP ĐỘ DỰ ÁN (PROJECT SCOPE) ---
// ==========================================

// Xem chi tiết dự án: Phải có quyền READ PROJECT bên trong dự án đó
router.get('/:id', requirePermission('PROJECT', 'READ', 'PROJECT'), projectController.getProjectDetail);

// Sửa dự án: Phải có quyền UPDATE PROJECT (VD: PROJECT_ADMIN, PM)
router.put('/:id', requirePermission('PROJECT', 'UPDATE', 'PROJECT'), projectController.updateProject);

// Xóa dự án: Cần quyền DELETE PROJECT
router.delete('/:id', requirePermission('PROJECT', 'DELETE', 'PROJECT'), projectController.deleteProject);

module.exports = router;