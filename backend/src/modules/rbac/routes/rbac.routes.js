const express = require('express');
const router = express.Router();
const rbacController = require('../controllers/rbac.controller');
const requireAuth = require('../../auth/middlewares/requireAuth');
const requirePermission = require('../middlewares/requirePermission.middleware');

router.use(requireAuth);

// Chỉ SYSTEM_ADMIN hoặc người có quyền thao tác RBAC mới được truy cập
const checkRbacWrite = requirePermission('RBAC', 'WRITE', 'SYSTEM');
const checkRbacRead = requirePermission('RBAC', 'READ', 'SYSTEM');

// Phân hệ Permissions
router.get('/permissions', checkRbacRead, rbacController.getPermissions);
router.post('/permissions', checkRbacWrite, rbacController.createPermission);

// Phân hệ Roles
router.get('/roles', checkRbacRead, rbacController.getRoles);
router.post('/roles', checkRbacWrite, rbacController.createRole);

// Gán / Thu hồi quyền
router.post('/roles/:roleId/permissions/:permissionId', checkRbacWrite, rbacController.assignPermission);
router.delete('/roles/:roleId/permissions/:permissionId', checkRbacWrite, rbacController.removePermission);

module.exports = router;