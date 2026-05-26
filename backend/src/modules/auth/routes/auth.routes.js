const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');

router.post('/login', authController.login);

router.post('/forgot-password', authController.forgotPassword);

router.post('/reset-password', authController.resetPassword);

// Endpoint chính FE sẽ dùng
router.post('/refresh-token', authController.refreshToken);

// Alias để không vỡ các FE cũ nếu còn gọi /auth/refresh
router.post('/refresh', authController.refreshToken);

module.exports = router;