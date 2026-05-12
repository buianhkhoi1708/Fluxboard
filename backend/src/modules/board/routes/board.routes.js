const express = require('express');
const router = express.Router();
const multer = require('multer');
const boardController = require('../controllers/board.controller');
const taskController = require('../controllers/task.controller'); 
const requireAuth = require('../../auth/middlewares/requireAuth');
const requirePermission = require('../../../common/middlewares/requirePermission');

// Cấu hình Multer hứng file lưu tạm vào RAM (để đẩy lên AWS S3)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }); // Limit 5MB

// Mọi request phải đi qua check Auth (Bắt buộc phải đăng nhập)
router.use(requireAuth);

// ==========================================
// 1. QUẢN LÝ BẢNG & CỘT (BOARD & COLUMN)
// ==========================================

router.post('/', requirePermission('PROJECT', 'UPDATE', 'PROJECT'), boardController.createBoard);
router.post('/columns', boardController.createColumn);
router.get('/:id', boardController.getBoardDetail);

// ==========================================
// 2. QUẢN LÝ THẺ CÔNG VIỆC (TASK)
// ==========================================

router.post('/tasks', taskController.createTask);
router.put('/tasks/:id', taskController.updateTask);
router.delete('/tasks/:id', taskController.deleteTask);
router.put('/tasks/:id/move', taskController.moveTask);

// ==========================================
// 3. QUẢN LÝ CHECKLIST (SUBTASKS)
// ==========================================

router.post('/tasks/:id/subtasks', taskController.addSubtask);
router.put('/tasks/:id/subtasks/:subtaskId', taskController.updateSubtask);
router.delete('/tasks/:id/subtasks/:subtaskId', taskController.deleteSubtask);

// ==========================================
// 4. QUẢN LÝ BÌNH LUẬN (COMMENTS)
// ==========================================

router.get('/tasks/:id/comments', taskController.getTaskComments);
router.post('/tasks/:id/comments', taskController.addComment);
router.delete('/tasks/:id/comments/:commentId', taskController.deleteComment);

// ==========================================
// 5. ĐÍNH KÈM FILE (ATTACHMENTS VIA AWS S3)
// ==========================================

router.get('/tasks/:id/attachments', taskController.getTaskAttachments);
router.post('/tasks/:id/attachments', upload.single('file'), taskController.uploadAttachment);

// ==========================================
// 6. LỊCH SỬ HOẠT ĐỘNG (ACTIVITY LOGS)
// ==========================================

router.get('/tasks/:id/activities', taskController.getTaskActivities);

module.exports = router;