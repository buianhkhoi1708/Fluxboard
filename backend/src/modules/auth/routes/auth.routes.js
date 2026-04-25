const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

/**
 * @route   POST /api/v1/auth/login
 * @desc    Đăng nhập người dùng và trả về Access Token + Refresh Token
 * @access  Public
 */
router.post('/login', authController.login);

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Gửi email chứa liên kết đặt lại mật khẩu
 * @access  Public
 */
router.post('/forgot-password', authController.forgotPassword);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Xác thực token và thiết lập mật khẩu mới
 * @access  Public
 */
router.post('/reset-password', authController.resetPassword);

/**
 * @route   POST /api/v1/auth/refresh-token
 * @desc    Cấp Access Token mới khi Access Token cũ hết hạn bằng Refresh Token
 * @access  Public (Yêu cầu gửi refreshToken trong body)
 */
router.post('/refresh-token', authController.refreshToken);

module.exports = router;