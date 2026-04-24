const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');
const projectMemberController = require('../controllers/projectMember.controller');
const requireAuth = require('../../auth/middlewares/requireAuth');

router.use(requireAuth);

// CRUD Projects
router.post('/', projectController.createProject);
router.get('/', projectController.getUserProjects);
// Giả định bạn đã có các controller này từ đợt trước
router.get('/:id', projectController.getProjectDetail);
router.put('/:id', projectController.updateProject);
router.delete('/:id', projectController.deleteProject);

// Quản lý Members trong Project
router.post('/members', projectMemberController.addMember);
router.delete('/members', projectMemberController.removeMember);
router.put('/:projectId/members/:userId', projectMemberController.updateMemberRole);

module.exports = router;