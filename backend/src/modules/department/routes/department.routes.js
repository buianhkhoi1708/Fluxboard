const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/department.controller');
const teamController = require('../../team/controllers/team.controller'); 

const requireAuth = require('../../auth/middlewares/requireAuth');
const requirePermission = require('../../rbac/middlewares/requirePermission.middleware');

router.use(requireAuth);

router.get('/', requirePermission('ORGANIZATION', 'READ'), departmentController.getAllDepartments);

router.post('/', requirePermission('ORGANIZATION', 'WRITE'), departmentController.createDepartment);

router.get('/:departmentId/teams', requirePermission('ORGANIZATION', 'READ'), teamController.getTeamsByDepartment);

module.exports = router;