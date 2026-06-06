const express = require("express");

const router = express.Router();

const activityController = require("../controllers/activity.controller");
const requireAuth = require("../../auth/middlewares/requireAuth");
const User = require("../../user/models/user.model");
const AppError = require("../../../common/exceptions/AppError");

const normalizeRoleName = (value) => {
  if (!value) return "";

  return String(value)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
};

const getRoleNameFromReq = (req) => {
  return normalizeRoleName(
    req.user?.system_role || req.user?.role_name || req.user?.role_code,
  );
};

const requireSystemAdmin = async (req, res, next) => {
  try {
    const tokenRole = getRoleNameFromReq(req);

    if (tokenRole === "SYSTEM_ADMIN") {
      return next();
    }

    const user = await User.findById(req.user?.id)
      .populate("role_id", "name scope")
      .lean();

    const dbRole = normalizeRoleName(user?.role_id?.name);

    if (dbRole !== "SYSTEM_ADMIN") {
      return next(
        new AppError(
          "Only SYSTEM_ADMIN can access activity management",
          403,
          "FORBIDDEN",
        ),
      );
    }

    return next();
  } catch (error) {
    next(error);
  }
};

router.use(requireAuth);

router.get("/", requireSystemAdmin, activityController.getAllActivities);

router.get(
  "/security",
  requireSystemAdmin,
  activityController.getSecurityActivities,
);

router.get("/projects/:projectId", activityController.getProjectActivities);

module.exports = router;
