const express = require('express');
const router = express.Router();
const teamController = require('../controllers/team.controller');
const requireAuth = require('../../auth/middlewares/requireAuth');
const requirePermission = require('../../rbac/middlewares/requirePermission.middleware');

router.use(requireAuth);

// POST /api/v1/organization/teams
router.post('/', requirePermission('ORGANIZATION', 'WRITE'), teamController.createTeam);

module.exports = router;