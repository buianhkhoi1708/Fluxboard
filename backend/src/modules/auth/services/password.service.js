const crypto = require('crypto');
const bcrypt = require('bcrypt');
const User = require('../../user/models/user.model');
const emailService = require('../../email/services/email.service');
const AppError = require('../../../common/exceptions/AppError');

exports.forgotPassword = async (email) => {
    const user = await User.findOne({ email });
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.reset_password_token = await bcrypt.hash(resetToken, 10);
    user.reset_password_expires = Date.now() + 15 * 60 * 1000; // 15 phút
    await user.save();

    const resetUrl = `http://${process.env.HOST}:${process.env.PORT}/api/v1/auth/reset-password?token=${resetToken}&email=${email}`;
    await emailService.sendEmail(email, 'FluxBoard - Password Reset', `<p>Click here to reset your password: <a href="${resetUrl}">${resetUrl}</a></p>`);
};

exports.resetPassword = async (email, token, newPassword) => {
    const user = await User.findOne({ email, reset_password_expires: { $gt: Date.now() } }).select('+reset_password_token +password_hash');
    if (!user) throw new AppError('Token invalid or expired', 400, 'INVALID_TOKEN');

    const isValidToken = await bcrypt.compare(token, user.reset_password_token);
    if (!isValidToken) throw new AppError('Token invalid', 400, 'INVALID_TOKEN');

    user.password_hash = await bcrypt.hash(newPassword, 10);
    user.reset_password_token = undefined;
    user.reset_password_expires = undefined;
    await user.save();
};