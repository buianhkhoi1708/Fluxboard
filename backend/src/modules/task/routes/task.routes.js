const express = require('express');
const router = express.Router();
const multer = require('multer');
const taskController = require('../controllers/task.controller'); 
const requireAuth = require('../../auth/middlewares/requireAuth');

// Cấu hình Multer hứng file lưu tạm vào RAM (để đẩy lên AWS S3)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }); // Limit 5MB

// Mọi request phải đi qua check Auth (Bắt buộc phải đăng nhập)
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
router.put('/:id/subtasks/:subtaskId', taskController.updateSubtask);
router.delete('/:id/subtasks/:subtaskId', taskController.deleteSubtask);

// ==========================================
// 3. QUẢN LÝ BÌNH LUẬN (COMMENTS)
// ==========================================
router.get('/:id/comments', taskController.getTaskComments);
router.post('/:id/comments', taskController.addComment);
router.delete('/:id/comments/:commentId', taskController.deleteComment);

// ==========================================
// 4. ĐÍNH KÈM FILE (ATTACHMENTS VIA AWS S3)
// ==========================================
router.get('/:id/attachments', taskController.getTaskAttachments);
router.post('/:id/attachments', upload.single('file'), taskController.uploadAttachment);

module.exports = router;