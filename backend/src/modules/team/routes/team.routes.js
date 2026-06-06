const express = require("express");
const router = express.Router();
const teamController = require("../controllers/team.controller");
const requireAuth = require("../../auth/middlewares/requireAuth");
const requirePermission = require("../../rbac/middlewares/requirePermission.middleware");

router.use(requireAuth);

router.post(
  "/",
  requirePermission("TEAM", "CREATE", "SYSTEM"),
  teamController.createTeam,
);

module.exports = router;
