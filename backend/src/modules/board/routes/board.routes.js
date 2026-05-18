const express = require('express');
const router = express.Router();
const boardController = require('../controllers/board.controller');
const requireAuth = require('../../auth/middlewares/requireAuth');
const requirePermission = require('../../../common/middlewares/requirePermission');

// Mọi request phải đi qua check Auth (Bắt buộc phải đăng nhập)
router.use(requireAuth);

// ==========================================
// QUẢN LÝ BẢNG (BOARD)
// ==========================================

// Tạo bảng mới (Yêu cầu quyền UPDATE PROJECT)
router.post('/', requirePermission('PROJECT', 'UPDATE', 'PROJECT'), boardController.createBoard);

// Lấy chi tiết bảng
router.get('/:id', boardController.getBoardDetail);

module.exports = router;