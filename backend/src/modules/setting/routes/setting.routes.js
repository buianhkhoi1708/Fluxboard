const express = require("express");
const router = express.Router();

const settingController = require("../controllers/setting.controller");
const requireAuth = require("../../auth/middlewares/requireAuth");

router.use(requireAuth);

router.get("/profile", settingController.getProfileOverview);
router.put("/profile", settingController.updateProfileInfo);

router.put("/security/password", settingController.changePassword);
router.get("/security/sessions", settingController.getActiveSessions);
router.delete("/security/sessions", settingController.signOutAllSessions);
router.delete(
  "/security/sessions/:sessionId",
  settingController.revokeSessionById,
);

router.get("/notifications", settingController.getNotificationSettings);
router.put("/notifications", settingController.updateNotificationSettings);

router.post("/security/2fa/setup", settingController.setup2FA);
router.put("/security/2fa/toggle", settingController.toggle2FA);

router.get("/security/logs", settingController.getSecurityLogs);

module.exports = router;
