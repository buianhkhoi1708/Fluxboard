const express = require('express');
const router = express.Router();
const rbacController = require('../controllers/rbac.controller');
const requireAuth = require('../../auth/middlewares/requireAuth');
const requirePermission = require('../middlewares/requirePermission.middleware');

router.use(requireAuth);

router.post('/permissions', requirePermission('RBAC', 'WRITE'), rbacController.createPermission);
router.get('/roles', requirePermission('RBAC', 'READ'), rbacController.getRoles);

module.exports = router;