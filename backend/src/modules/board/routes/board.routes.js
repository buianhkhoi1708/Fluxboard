const express = require('express');
const router = express.Router();
const boardController = require('../controllers/board.controller');
const taskController = require('../controllers/task.controller'); 
const requireAuth = require('../../auth/middlewares/requireAuth');
const requirePermission = require('../../../common/middlewares/requirePermission');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Mọi request phải đi qua check Auth (Bắt buộc phải đăng nhập)
router.use(requireAuth);

// ==========================================
// QUẢN LÝ BẢNG & CỘT (BOARD & COLUMN)
// ==========================================

// Tạo Bảng: Bắt buộc phải có quyền quản lý dự án (MANAGE_BOARDS hoặc UPDATE)
router.post('/', requirePermission('PROJECT', 'UPDATE', 'PROJECT'), boardController.createBoard);

// Thêm cột mới vào Bảng
router.post('/columns', boardController.createColumn);

// Lấy chi tiết Bảng (Kèm theo mảng Cột và Task bên trong)
router.get('/:id', boardController.getBoardDetail);

// ==========================================
// QUẢN LÝ THẺ CÔNG VIỆC (TASK)
// ==========================================

// Tạo Task mới
router.post('/tasks', taskController.createTask);

// Cập nhật Task (Đổi tên, mô tả, gán người, set deadline...)
router.put('/tasks/:id', taskController.updateTask);

// Xóa Task
router.delete('/tasks/:id', taskController.deleteTask);

// Kéo thả Task (Di chuyển vị trí/đổi cột)
router.put('/tasks/:id/move', taskController.moveTask);

// ==========================================
// QUẢN LÝ CHECKLIST (SUBTASKS)
// ==========================================

// Thêm Subtask mới vào Task
router.post('/tasks/:id/subtasks', taskController.addSubtask);

// Sửa trạng thái (Tick xanh) hoặc đổi tên Subtask
router.put('/tasks/:id/subtasks/:subtaskId', taskController.updateSubtask);

// Xóa Subtask
router.delete('/tasks/:id/subtasks/:subtaskId', taskController.deleteSubtask);

// ==========================================
// 4. QUẢN LÝ BÌNH LUẬN (COMMENTS)
// ==========================================

// Lấy danh sách bình luận của 1 Task
router.get('/tasks/:id/comments', taskController.getTaskComments);

// Thêm bình luận mới vào Task
router.post('/tasks/:id/comments', taskController.addComment);

// Xóa bình luận
router.delete('/tasks/:id/comments/:commentId', taskController.deleteComment);

// ==========================================
// 5. LỊCH SỬ HOẠT ĐỘNG (ACTIVITY LOGS)
// ==========================================

// Lấy danh sách lịch sử hoạt động của 1 Task
router.get('/tasks/:id/activities', taskController.getTaskActivities);

// ==========================================
// 6. ĐÍNH KÈM FILE (ATTACHMENTS VIA S3)
// ==========================================

router.get('/tasks/:id/attachments', taskController.getTaskAttachments);
router.post('/tasks/:id/attachments', upload.single('file'), taskController.uploadAttachment);

module.exports = router;