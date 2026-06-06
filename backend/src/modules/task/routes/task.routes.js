const express = require("express");
const router = express.Router();

const taskController = require("../controllers/task.controller");
const requireAuth = require("../../auth/middlewares/requireAuth");

const requirePermission = require("../../../common/middlewares/requirePermission");

router.use(requireAuth);

router.get("/my-tasks", taskController.getMyTasks);

router.post(
  "/",
  requirePermission("TASK", "CREATE", "PROJECT"),
  taskController.createTask,
);

router.put(
  "/:id",
  requirePermission("TASK", "UPDATE", "PROJECT"),
  taskController.updateTask,
);
router.delete(
  "/:id",
  requirePermission("TASK", "DELETE", "PROJECT"),
  taskController.deleteTask,
);
router.put(
  "/:id/move",
  requirePermission("TASK", "UPDATE", "PROJECT"),
  taskController.moveTask,
);

router.post(
  "/:id/subtasks",
  requirePermission("TASK", "UPDATE", "PROJECT"),
  taskController.addSubtask,
);
router.post(
  "/:id/subtasks/bulk",
  requirePermission("TASK", "UPDATE", "PROJECT"),
  taskController.addMultipleSubtasks,
);
router.put(
  "/:id/subtasks/:subtaskId",
  requirePermission("TASK", "UPDATE", "PROJECT"),
  taskController.updateSubtask,
);
router.delete(
  "/:id/subtasks/:subtaskId",
  requirePermission("TASK", "UPDATE", "PROJECT"),
  taskController.deleteSubtask,
);

router.get(
  "/:id/comments",
  requirePermission("TASK", "READ", "PROJECT"),
  taskController.getTaskComments,
);
router.post(
  "/:id/comments",
  requirePermission("COMMENT", "CREATE", "PROJECT"),
  taskController.addComment,
);
router.put(
  "/:id/comments/:commentId",
  requirePermission("COMMENT", "UPDATE", "PROJECT"),
  taskController.updateComment,
);
router.patch(
  "/:id/comments/:commentId/resolve",
  requirePermission("COMMENT", "UPDATE", "PROJECT"),
  taskController.resolveComment,
);
router.delete(
  "/:id/comments/:commentId",
  requirePermission("COMMENT", "DELETE", "PROJECT"),
  taskController.deleteComment,
);

router.get(
  "/:id/attachments",
  requirePermission("ATTACHMENT", "READ", "PROJECT"),
  taskController.getTaskAttachments,
);
router.post(
  "/:id/attachments/presigned-url",
  requirePermission("ATTACHMENT", "CREATE", "PROJECT"),
  taskController.getAttachmentUploadUrl,
);
router.post(
  "/:id/attachments",
  requirePermission("ATTACHMENT", "CREATE", "PROJECT"),
  taskController.saveAttachmentMetadata,
);
router.delete(
  "/:id/attachments/:attachmentId",
  requirePermission("ATTACHMENT", "DELETE", "PROJECT"),
  taskController.deleteAttachment,
);

router.get(
  "/:id/activities",
  requirePermission("ACTIVITY", "READ", "PROJECT"),
  taskController.getTaskActivities,
);

module.exports = router;
