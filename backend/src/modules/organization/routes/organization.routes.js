const express = require("express");
const router = express.Router();
const organizationController = require("../controllers/organization.controller");
const requireAuth = require("../../auth/middlewares/requireAuth");
const requirePermission = require("../../rbac/middlewares/requirePermission.middleware");

router.use(requireAuth);

router.get(
  "/tree",
  requirePermission("DEPARTMENT", "READ", "SYSTEM"),
  organizationController.getTree,
);

router.post(
  "/departments",
  requirePermission("DEPARTMENT", "CREATE", "SYSTEM"),
  organizationController.createDepartment,
);
router.put(
  "/departments/:id",
  requirePermission("DEPARTMENT", "UPDATE", "SYSTEM"),
  organizationController.updateDepartment,
);
router.delete(
  "/departments/:id",
  requirePermission("DEPARTMENT", "DELETE", "SYSTEM"),
  organizationController.deleteDepartment,
);

router.post(
  "/teams",
  requirePermission("TEAM", "CREATE", "SYSTEM"),
  organizationController.createTeam,
);
router.put(
  "/teams/:teamId",
  requirePermission("TEAM", "UPDATE", "SYSTEM"),
  organizationController.updateTeam,
);

router.get(
  "/users/unassigned",
  requirePermission("USER", "READ", "SYSTEM"),
  organizationController.getUnassignedUsers,
);

router.post(
  "/teams/:teamId/users",
  requirePermission("TEAM", "UPDATE", "SYSTEM"),
  organizationController.assignToTeam,
);
router.delete(
  "/teams/:teamId/users/:userId",
  requirePermission("TEAM", "UPDATE", "SYSTEM"),
  organizationController.removeUserFromTeam,
);

router.get(
  "/search",
  requirePermission("USER", "READ", "SYSTEM"),
  organizationController.searchUsers,
);

module.exports = router;
