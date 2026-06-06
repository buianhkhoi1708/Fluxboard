const express = require("express");
const router = express.Router();
const projectController = require("../controllers/project.controller");
const requireAuth = require("../../auth/middlewares/requireAuth");
const requirePermission = require("../../../common/middlewares/requirePermission");

router.use(requireAuth);

router.post(
  "/",
  requirePermission("PROJECT", "CREATE", "SYSTEM"),
  projectController.createProject,
);
router.get("/", projectController.getUserProjects);

router.get("/overviews", projectController.getUserProjects);

router.get(
  "/:id",
  requirePermission("PROJECT", "READ", "PROJECT"),
  projectController.getProjectDetail,
);
router.put(
  "/:id",
  requirePermission("PROJECT", "UPDATE", "PROJECT"),
  projectController.updateProject,
);
router.delete(
  "/:id",
  requirePermission("PROJECT", "DELETE", "PROJECT"),
  projectController.deleteProject,
);

router.post(
  "/:id/teams/assign",
  requirePermission("PROJECT", "UPDATE", "PROJECT"),
  projectController.assignProjectToTeam,
);

router.post(
  "/:id/members",
  requirePermission("PROJECT", "MANAGE_MEMBERS", "PROJECT"),
  projectController.addMemberToProject,
);

module.exports = router;
