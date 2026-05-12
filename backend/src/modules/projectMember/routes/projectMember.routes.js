const express = require('express');
const router = express.Router();
const projectMemberController = require('../controllers/projectMember.controller');
const requireAuth = require('../../auth/middlewares/requireAuth');
const requirePermission = require('../../../common/middlewares/requirePermission');

router.use(requireAuth);

// ==========================================
// QUẢN LÝ THÀNH VIÊN DỰ ÁN
// ==========================================

router.post('/members', requirePermission('PROJECT', 'MANAGE_MEMBERS', 'PROJECT'), projectMemberController.addMember);
router.delete('/members', requirePermission('PROJECT', 'MANAGE_MEMBERS', 'PROJECT'), projectMemberController.removeMember);
router.put('/:projectId/members/:userId', requirePermission('PROJECT', 'MANAGE_MEMBERS', 'PROJECT'), projectMemberController.updateMemberRole);

module.exports = router;