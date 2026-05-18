const express = require('express');
const router = express.Router();
const organizationController = require('../controllers/organization.controller');
const requireAuth = require('../../auth/middlewares/requireAuth');
const requirePermission = require('../../rbac/middlewares/requirePermission.middleware');

router.use(requireAuth);

// Endpoint xương sống cho trang Organization
router.get('/tree', requirePermission('ORGANIZATION', 'READ'), organizationController.getTree);

module.exports = router;