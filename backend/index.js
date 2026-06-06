const express = require("express");
const router = express.Router();

router.use("/auth", require("./src/modules/auth/routes/auth.routes"));
router.use("/users", require("./src/modules/user/routes/user.routes"));
router.use("/rbac", require("./src/modules/rbac/routes/rbac.routes"));
router.use(
  "/departments",
  require("./src/modules/department/routes/department.routes"),
);
router.use("/teams", require("./src/modules/team/routes/team.routes"));
router.use(
  "/organizations",
  require("./src/modules/organization/routes/organization.routes"),
);

router.use("/projects", require("./src/modules/project/routes/project.routes"));
router.use(
  "/projects",
  require("./src/modules/projectMember/routes/projectMember.routes"),
);

router.use("/columns", require("./src/modules/column/routes/column.routes"));
router.use("/tasks", require("./src/modules/task/routes/task.routes"));
router.use("/boards", require("./src/modules/board/routes/board.routes"));
router.use("/ai", require("./src/modules/ai/routes/ai.routes"));
router.use("/media", require("./src/modules/media/routes/media.routes"));
router.use(
  "/activities",
  require("./src/modules/activity/routes/activity.routes"),
);
router.use(
  "/dashboard",
  require("./src/modules/dashboard/routes/dashboard.routes"),
);
router.use(
  "/notifications",
  require("./src/modules/notification/routes/notification.routes"),
);
router.use(
  "/deadlines",
  require("./src/modules/deadline/routes/deadline.routes"),
);
router.use("/settings", require("./src/modules/setting/routes/setting.routes"));

module.exports = router;
