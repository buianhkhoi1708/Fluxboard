const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const requireAuth = require('../../auth/middlewares/requireAuth');

router.use(requireAuth);

// Các API thao tác với dữ liệu cá nhân (đặt lên trước để không bị dính param :id)
router.get('/me', userController.getCurrentProfile);
router.put('/me', userController.updateProfile);
router.put('/me/password', userController.changePassword);

// Các API hệ thống
router.get('/:id', userController.getUserById);

module.exports = router;