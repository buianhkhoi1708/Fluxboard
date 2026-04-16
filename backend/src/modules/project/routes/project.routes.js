const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');
const projectMemberController = require('../controllers/projectMember.controller');
const requireAuth = require('../../auth/middlewares/requireAuth');

router.use(requireAuth);

router.post('/', projectController.createProject);
router.get('/', projectController.getUserProjects);

router.post('/members', projectMemberController.addMember);
router.delete('/members', projectMemberController.removeMember);

module.exports = router;