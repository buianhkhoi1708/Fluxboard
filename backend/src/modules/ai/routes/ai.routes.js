const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const requireAuth = require('../../auth/middlewares/requireAuth');
const requirePermission = require('../../rbac/middlewares/requirePermission.middleware');

router.use(requireAuth);

router.post('/generate-board', requirePermission('AI_BOARD', 'WRITE'), aiController.generateBoard);

module.exports = router;