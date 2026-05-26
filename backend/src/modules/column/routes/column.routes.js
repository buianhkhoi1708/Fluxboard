const express = require('express');
const router = express.Router();
const columnController = require('../controllers/column.controller');
const requireAuth = require('../../auth/middlewares/requireAuth');
const requirePermission = require('../../../common/middlewares/requirePermission'); // 🚀 IMPORT RBAC

// Mọi request phải đi qua check Auth (Bắt buộc phải đăng nhập)
router.use(requireAuth);

// ==========================================
// QUẢN LÝ CỘT (COLUMN)
// ==========================================

// 🚀 Tạo cột mới (Quyền COLUMN : CREATE : PROJECT)
router.post('/', requirePermission('COLUMN', 'CREATE', 'PROJECT'), columnController.createColumn);

// 🚀 Sửa tên cột (Quyền COLUMN : UPDATE : PROJECT)
router.put('/:id', requirePermission('COLUMN', 'UPDATE', 'PROJECT'), columnController.updateColumn);

// 🚀 Xóa cột (Quyền COLUMN : DELETE : PROJECT)
router.delete('/:id', requirePermission('COLUMN', 'DELETE', 'PROJECT'), columnController.deleteColumn);

module.exports = router;