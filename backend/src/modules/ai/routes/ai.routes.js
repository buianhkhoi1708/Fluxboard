const express = require("express");
const router = express.Router();
const aiController = require("../controllers/ai.controller");
const requireAuth = require("../../auth/middlewares/requireAuth");
const requirePermission = require("../../rbac/middlewares/requirePermission.middleware");

router.use(requireAuth);

const rateLimits = new Map();
const aiRateLimiter = (req, res, next) => {
  const userId = req.user.id;
  const now = Date.now();
  const windowMs = 60 * 1000;
  const limit = 5;

  if (!rateLimits.has(userId)) rateLimits.set(userId, []);
  const requests = rateLimits
    .get(userId)
    .filter((time) => now - time < windowMs);

  if (requests.length >= limit) {
    return res.status(429).json({
      success: false,
      message: "Vượt quá giới hạn 5 yêu cầu/phút. Vui lòng đợi và thử lại sau.",
    });
  }

  requests.push(now);
  rateLimits.set(userId, requests);
  next();
};

router.use(aiRateLimiter);

router.post(
  "/generate-board",
  requirePermission("BOARD", "UPDATE", "PROJECT"),
  aiController.generateSmartTasks,
);

router.get(
  "/deviation/:projectId",
  requirePermission("PROJECT", "READ", "PROJECT"),
  aiController.getDeviationInsights,
);

router.post(
  "/insights",
  requirePermission("PROJECT", "READ", "PROJECT"),
  aiController.generateInsights,
);

router.post(
  "/generate-subtasks",
  requirePermission("TASK", "CREATE", "PROJECT"),
  aiController.generateSubtasks,
);

router.get(
  "/summarize-task/:taskId",
  requirePermission("TASK", "READ", "PROJECT"),
  aiController.summarizeTaskActivity,
);

module.exports = router;
