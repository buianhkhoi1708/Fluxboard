const express = require("express");
const router = express.Router();

const authController = require("../controllers/auth.controller");

router.post("/login", authController.login);
router.post("/forgot-password", authController.forgotPassword);
router.get("/verify-reset-token", authController.verifyResetToken);
router.post("/reset-password", authController.resetPassword);
router.post("/refresh-token", authController.refreshToken);
router.post("/refresh", authController.refreshToken);

module.exports = router;
