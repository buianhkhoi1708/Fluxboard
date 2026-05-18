const express = require('express');
const router = express.Router({ mergeParams: true }); 
const projectMemberController = require('../controllers/projectMember.controller');
const requireAuth = require('../../auth/middlewares/requireAuth');
const requirePermission = require('../../../common/middlewares/requirePermission');

// Chốt chặn xác thực
router.use(requireAuth);

// --- QUẢN LÝ THÀNH VIÊN DỰ ÁN ---

// Lấy danh sách thành viên (Dùng :projectId trên URL để xác định dự án)
router.get('/:projectId/members', projectMemberController.getMembers);

// Thêm người vào dự án (Yêu cầu quyền MANAGE_MEMBERS)
router.post('/:projectId/members', requirePermission('PROJECT', 'MANAGE_MEMBERS', 'PROJECT'), projectMemberController.addMember);

// Cập nhật vai trò/trạng thái (Sẽ kích hoạt Socket Force Logout nếu quyền thay đổi)
// Đã sửa tên hàm thành 'updateMember' để khớp với Service xử lý logic đa quyền
router.put('/:projectId/members/:userId', requirePermission('PROJECT', 'MANAGE_MEMBERS', 'PROJECT'), projectMemberController.updateMember);

// Xóa thành viên khỏi dự án
router.delete('/:projectId/members/:userId', requirePermission('PROJECT', 'MANAGE_MEMBERS', 'PROJECT'), projectMemberController.removeMember);

module.exports = router;