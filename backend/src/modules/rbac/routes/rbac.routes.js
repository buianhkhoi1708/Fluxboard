const express = require("express");
const router = express.Router();
const rbacController = require("../controllers/rbac.controller");
const requireAuth = require("../../auth/middlewares/requireAuth");
const requirePermission = require("../middlewares/requirePermission.middleware");

router.use(requireAuth);

const checkRbacWrite = requirePermission("RBAC", "WRITE", "SYSTEM");
const checkRbacRead = requirePermission("RBAC", "READ", "SYSTEM");

router.get("/permissions", checkRbacRead, rbacController.getPermissions);
router.post("/permissions", checkRbacWrite, rbacController.createPermission);

router.get("/roles", rbacController.getRoles);
router.post("/roles", checkRbacWrite, rbacController.createRole);
router.get(
  "/roles/:roleId/permissions",
  checkRbacRead,
  rbacController.getPermissionsByRole,
);

router.post(
  "/roles/:roleId/permissions/:permissionId",
  checkRbacWrite,
  rbacController.assignPermission,
);
router.delete(
  "/roles/:roleId/permissions/:permissionId",
  checkRbacWrite,
  rbacController.removePermission,
);

module.exports = router;
