const express = require('express');
const router = express.Router();

const taskController = require('../controllers/task.controller');
const requireAuth = require('../../auth/middlewares/requireAuth');
// 🚀 1. IMPORT MIDDLEWARE PHÂN QUYỀN VÀO ĐÂY
const requirePermission = require('../../../common/middlewares/requirePermission'); 

// Bắt buộc đăng nhập
router.use(requireAuth);

// ==========================================
// 1. QUẢN LÝ THẺ CÔNG VIỆC (TASK CORE)
// ==========================================
// Route này chỉ lấy task của cá nhân user đang đăng nhập nên không cần check quyền RBAC
router.get('/my-tasks', taskController.getMyTasks);

// 🚀 2. GẮN CHỐT CHẶN: Chỉ ai có quyền [TASK : CREATE : PROJECT] mới được tạo
router.post('/', requirePermission('TASK', 'CREATE', 'PROJECT'), taskController.createTask);

// 🚀 Tương tự cho Sửa, Xóa và Di chuyển (Cần quyền UPDATE hoặc DELETE)
router.put('/:id', requirePermission('TASK', 'UPDATE', 'PROJECT'), taskController.updateTask);
router.delete('/:id', requirePermission('TASK', 'DELETE', 'PROJECT'), taskController.deleteTask);
router.put('/:id/move', requirePermission('TASK', 'UPDATE', 'PROJECT'), taskController.moveTask);

// ==========================================
// 2. QUẢN LÝ CHECKLIST (SUBTASKS)
// ==========================================
// Tạo, Sửa, Xóa Subtask đều quy về quyền UPDATE TASK cho đơn giản
router.post('/:id/subtasks', requirePermission('TASK', 'UPDATE', 'PROJECT'), taskController.addSubtask);
router.post('/:id/subtasks/bulk', requirePermission('TASK', 'UPDATE', 'PROJECT'), taskController.addMultipleSubtasks);
router.put('/:id/subtasks/:subtaskId', requirePermission('TASK', 'UPDATE', 'PROJECT'), taskController.updateSubtask);
router.delete('/:id/subtasks/:subtaskId', requirePermission('TASK', 'UPDATE', 'PROJECT'), taskController.deleteSubtask);

// ==========================================
// 3. QUẢN LÝ BÌNH LUẬN (COMMENTS)
// ==========================================
router.get('/:id/comments', requirePermission('TASK', 'READ', 'PROJECT'), taskController.getTaskComments);
router.post('/:id/comments', requirePermission('COMMENT', 'CREATE', 'PROJECT'), taskController.addComment);
router.put('/:id/comments/:commentId', requirePermission('COMMENT', 'UPDATE', 'PROJECT'), taskController.updateComment);
router.patch('/:id/comments/:commentId/resolve', requirePermission('COMMENT', 'UPDATE', 'PROJECT'), taskController.resolveComment);
router.delete('/:id/comments/:commentId', requirePermission('COMMENT', 'DELETE', 'PROJECT'), taskController.deleteComment);

// ==========================================
// 4. ĐÍNH KÈM FILE (ATTACHMENTS VIA AWS S3)
// ==========================================
router.get('/:id/attachments', requirePermission('ATTACHMENT', 'READ', 'PROJECT'), taskController.getTaskAttachments);
router.post('/:id/attachments/presigned-url', requirePermission('ATTACHMENT', 'CREATE', 'PROJECT'), taskController.getAttachmentUploadUrl);
router.post('/:id/attachments', requirePermission('ATTACHMENT', 'CREATE', 'PROJECT'), taskController.saveAttachmentMetadata);
router.delete('/:id/attachments/:attachmentId', requirePermission('ATTACHMENT', 'DELETE', 'PROJECT'), taskController.deleteAttachment);

// ==========================================
// 5. NHẬT KÝ HOẠT ĐỘNG (ACTIVITY LOGS)
// ==========================================
router.get('/:id/activities', requirePermission('ACTIVITY', 'READ', 'PROJECT'), taskController.getTaskActivities);

module.exports = router;