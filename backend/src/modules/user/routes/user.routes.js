const express = require("express");
const router = express.Router();

const userController = require("../controllers/user.controller");
const requireAuth = require("../../auth/middlewares/requireAuth");

const requirePermissionModule = require("../../rbac/middlewares/requirePermission.middleware");
const requirePermission =
  typeof requirePermissionModule === "function"
    ? requirePermissionModule
    : requirePermissionModule.requirePermission;

router.use(requireAuth);

router.get("/", userController.getAllUsers);

router.get("/unassigned", userController.getUnassignedUsers);

router.get("/:id", userController.getUserById);

router.post(
  "/",
  requirePermission("USER", "CREATE", "SYSTEM"),
  userController.createUser,
);

router.put(
  "/:id/assign-team",
  requirePermission("USER", "UPDATE", "SYSTEM"),
  userController.assignToTeam,
);

router.put(
  "/:id/revoke",
  requirePermission("USER", "DELETE", "SYSTEM"),
  userController.revokeAccess,
);

module.exports = router;
