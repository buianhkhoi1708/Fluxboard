const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');
const requireAuth = require('../../auth/middlewares/requireAuth');
const requirePermission = require('../../../common/middlewares/requirePermission'); 

// Chốt chặn xác thực cho toàn bộ các route dự án
router.use(requireAuth);

// --- CẤP ĐỘ HỆ THỐNG (SYSTEM SCOPE) ---
// Tạo dự án mới (Yêu cầu quyền CREATE tại cấp độ SYSTEM)
router.post('/', requirePermission('PROJECT', 'CREATE', 'SYSTEM'), projectController.createProject);

// Lấy danh sách dự án của người dùng hiện tại (Không cần RBAC phức tạp)
router.get('/', projectController.getUserProjects);

// --- CẤP ĐỘ DỰ ÁN (PROJECT SCOPE) ---
// Xem chi tiết một dự án
router.get('/:id', requirePermission('PROJECT', 'READ', 'PROJECT'), projectController.getProjectDetail);

// Cập nhật thông tin dự án
router.put('/:id', requirePermission('PROJECT', 'UPDATE', 'PROJECT'), projectController.updateProject);

// Xóa dự án
router.delete('/:id', requirePermission('PROJECT', 'DELETE', 'PROJECT'), projectController.deleteProject);

module.exports = router;