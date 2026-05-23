const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');
const requireAuth = require('../../auth/middlewares/requireAuth');
const requirePermission = require('../../../common/middlewares/requirePermission'); 

router.use(requireAuth);

// ==========================================
// 1. CÁC ROUTE TĨNH (Phải đặt lên trên cùng)
// ==========================================
router.post('/', requirePermission('PROJECT', 'CREATE', 'SYSTEM'), projectController.createProject);
router.get('/', projectController.getUserProjects);

// 🚀 FIX LỖI INVALID_FORMAT: Đặt '/overviews' ở đây, trước khi có bất kỳ 'id' nào!
// (Sếp nhớ check xem trong projectController có hàm getOverviews không nhé, nếu tên khác thì sửa lại)
router.get('/overviews', projectController.getUserProjects);


// ==========================================
// 2. CÁC ROUTE ĐỘNG CHỨA :id (Phải đặt ở dưới)
// ==========================================
router.get('/:id', requirePermission('PROJECT', 'READ', 'PROJECT'), projectController.getProjectDetail);
router.put('/:id', requirePermission('PROJECT', 'UPDATE', 'PROJECT'), projectController.updateProject);
router.delete('/:id', requirePermission('PROJECT', 'DELETE', 'PROJECT'), projectController.deleteProject);

// Route gán team vào project (Sếp đã có)
router.post('/:id/teams/assign', requirePermission('PROJECT', 'UPDATE', 'PROJECT'), projectController.assignProjectToTeam);

// 🚀 FIX LỖI 404 NOT FOUND: Thêm API gán Member
// (Sếp nhớ check trong projectController xem có hàm addMembers hay tên tương tự để đổi cho khớp nha)
router.post('/:id/members', requirePermission('PROJECT', 'UPDATE', 'PROJECT'), projectController.addMemberToProject);

module.exports = router;