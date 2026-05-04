const express = require('express');
const router = express.Router();
const boardController = require('../controllers/board.controller');
const taskController = require('../controllers/task.controller'); 
const requireAuth = require('../../auth/middlewares/requireAuth');
const requirePermission = require('../../../common/middlewares/requirePermission');

// Mọi request phải đi qua check Auth (Bắt buộc phải đăng nhập)
router.use(requireAuth);

// ==========================================
// 1. QUẢN LÝ BẢNG & CỘT (BOARD & COLUMN)
// ==========================================

// Tạo Bảng: Bắt buộc phải có quyền quản lý dự án (MANAGE_BOARDS hoặc UPDATE)
router.post('/', requirePermission('PROJECT', 'UPDATE', 'PROJECT'), boardController.createBoard);

// Thêm cột mới vào Bảng
router.post('/columns', boardController.createColumn);

// Lấy chi tiết Bảng (Kèm theo mảng Cột và Task bên trong)
router.get('/:id', boardController.getBoardDetail);


// ==========================================
// 2. QUẢN LÝ THẺ CÔNG VIỆC (TASK)
// ==========================================

// Tạo Task mới
router.post('/tasks', taskController.createTask);

// Cập nhật Task (Đổi tên, mô tả, gán người, set deadline...)
router.put('/tasks/:id', taskController.updateTask);

// Xóa Task
router.delete('/tasks/:id', taskController.deleteTask);

// Kéo thả Task (Di chuyển vị trí/đổi cột)
router.put('/tasks/:id/move', taskController.moveTask);

module.exports = router;