const express = require("express");
const router = express.Router({ mergeParams: true });
const projectMemberController = require("../controllers/projectMember.controller");
const requireAuth = require("../../auth/middlewares/requireAuth");
const requirePermission = require("../../../common/middlewares/requirePermission");

router.use(requireAuth);

router.get("/:id/members", projectMemberController.getMembers);

router.post(
  "/:id/members",
  requirePermission("PROJECT", "MANAGE_MEMBERS", "PROJECT"),
  projectMemberController.addMember,
);

router.put(
  "/:id/members/:userId",
  requirePermission("PROJECT", "MANAGE_MEMBERS", "PROJECT"),
  projectMemberController.updateMember,
);

router.delete(
  "/:id/members/:userId",
  requirePermission("PROJECT", "MANAGE_MEMBERS", "PROJECT"),
  projectMemberController.removeMember,
);

module.exports = router;
