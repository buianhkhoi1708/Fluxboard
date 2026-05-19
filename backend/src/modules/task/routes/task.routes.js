const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller'); 
const requireAuth = require('../../auth/middlewares/requireAuth');

router.use(requireAuth);

// ==========================================
// 1. QUẢN LÝ THẺ CÔNG VIỆC (TASK CORE)
// ==========================================
router.post('/', taskController.createTask);
router.put('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);
router.put('/:id/move', taskController.moveTask);

// ==========================================
// 2. QUẢN LÝ CHECKLIST (SUBTASKS)
// ==========================================
router.post('/:id/subtasks', taskController.addSubtask);
router.post('/:id/subtasks/bulk', taskController.addMultipleSubtasks); // Định tuyến nhận danh sách subtasks hàng loạt
router.put('/:id/subtasks/:subtaskId', taskController.updateSubtask);
router.delete('/:id/subtasks/:subtaskId', taskController.deleteSubtask);

// ==========================================
// 3. QUẢN LÝ BÌNH LUẬN (COMMENTS)
// ==========================================
router.get('/:id/comments', taskController.getTaskComments);
router.post('/:id/comments', taskController.addComment);
router.put('/:id/comments/:commentId', taskController.updateComment);
router.delete('/:id/comments/:commentId', taskController.deleteComment);

// ==========================================
// 4. ĐÍNH KÈM FILE (ATTACHMENTS VIA AWS S3)
// ==========================================
router.get('/:id/attachments', taskController.getTaskAttachments);
router.post('/:id/attachments/presigned-url', taskController.getAttachmentUploadUrl);
router.post('/:id/attachments', taskController.saveAttachmentMetadata);
router.delete('/:id/attachments/:attachmentId', taskController.deleteAttachment);

// ==========================================
// 5. NHẬT KÝ HOẠT ĐỘNG (ACTIVITY LOGS)
// ==========================================
router.get('/:id/activities', taskController.getTaskActivities);

module.exports = router;