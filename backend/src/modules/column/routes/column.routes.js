const express = require('express');
const router = express.Router();
const columnController = require('../controllers/column.controller');
const requireAuth = require('../../auth/middlewares/requireAuth');

// Mọi request phải đi qua check Auth (Bắt buộc phải đăng nhập)
router.use(requireAuth);

// ==========================================
// QUẢN LÝ CỘT (COLUMN)
// ==========================================

// Tạo cột mới
router.post('/', columnController.createColumn);

// (Mở rộng sau này: Sửa tên cột, Xóa cột)
// router.put('/:id', columnController.updateColumn);
// router.delete('/:id', columnController.deleteColumn);

module.exports = router;