const User = require('../../user/models/user.model');
const AppError = require('../../../common/exceptions/AppError');
const emailService = require('../../email/services/email.service');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

exports.forgotPassword = async (email) => {
    const user = await User.findOne({ email });
    if (!user || user.status === 'INACTIVE') {
        throw new AppError('User not found or inactive', 404, 'NOT_FOUND');
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.reset_password_token = resetTokenHash;
    user.reset_password_expires = Date.now() + 15 * 60 * 1000;
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}&email=${email}`;

    const emailHtml = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <div style="background-color: #4F46E5; padding: 30px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; letter-spacing: 1px;">FluxBoard</h1>
        </div>
        <div style="padding: 40px 30px; background-color: #ffffff;">
            <h2 style="color: #1f2937; margin-top: 0;">Password Reset Request</h2>
            <p style="color: #4b5563; line-height: 1.6; font-size: 16px;">Hello <strong>${user.full_name}</strong>,</p>
            <p style="color: #4b5563; line-height: 1.6; font-size: 16px;">We received a request to reset the password for the account associated with this email address. Please click the button below to set up a new password:</p>
            
            <div style="text-align: center; margin: 40px 0;">
                <a href="${resetLink}" style="background-color: #4F46E5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; display: inline-block;">🔑 Reset Password</a>
            </div>
            
            <p style="color: #4b5563; line-height: 1.6; font-size: 14px;"><em>Note: This secure link will automatically expire in <strong>15 minutes</strong>. If you did not request this change, you can safely ignore this email.</em></p>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; font-size: 13px; color: #9ca3af; border-top: 1px solid #e5e7eb;">
            This is an automated message from the FluxBoard management system. Please do not reply.<br><br>
            &copy; ${new Date().getFullYear()} FluxBoard Team. All rights reserved.
        </div>
    </div>
    `;

    await emailService.sendEmail(
        user.email,
        '[FluxBoard] Password Reset Request',
        emailHtml
    );
};

exports.resetPassword = async (email, token, newPassword) => {
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
        email,
        reset_password_token: resetTokenHash,
        reset_password_expires: { $gt: Date.now() }
    });

    if (!user) throw new AppError('Token is invalid or has expired', 400, 'BAD_REQUEST');

    user.password_hash = await bcrypt.hash(newPassword, 10);
    user.reset_password_token = undefined;
    user.reset_password_expires = undefined;
    await user.save();
};