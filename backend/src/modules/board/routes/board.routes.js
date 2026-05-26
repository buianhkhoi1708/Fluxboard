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

// 🚀 DÙNG QUYỀN BOARD CREATE
router.post('/', requirePermission('BOARD', 'CREATE', 'PROJECT'), boardController.createBoard);

// 🚀 BỌC GIÁP LUÔN CHO ROUTE GET: Phải có quyền đọc bảng mới được xem
router.get('/:id', boardController.getBoardDetail);

// 🚀 DÙNG ĐÚNG QUYỀN SỬA BẢNG
router.put('/:id', requirePermission('BOARD', 'UPDATE', 'PROJECT'), boardController.updateBoard);

// 🚀 DÙNG ĐÚNG QUYỀN XÓA BẢNG
router.delete('/:id', requirePermission('BOARD', 'DELETE', 'PROJECT'), boardController.deleteBoard);

module.exports = router;