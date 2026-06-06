const User = require("../../user/models/user.model");
const AppError = require("../../../common/exceptions/AppError");
const emailService = require("../../email/services/email.service");
const crypto = require("crypto");
const bcrypt = require("bcrypt");

const RESET_TOKEN_TTL_MINUTES = 15;

const hashToken = (token) => {
  return crypto
    .createHash("sha256")
    .update(String(token || ""))
    .digest("hex");
};

const findResetUser = async (email, token) => {
  if (!email || !token) {
    throw new AppError(
      "Liên kết đặt lại mật khẩu không hợp lệ.",
      400,
      "BAD_REQUEST",
    );
  }

  const user = await User.findOne({
    email,
    reset_password_token: hashToken(token),
    reset_password_expires: { $gt: Date.now() },
  });

  if (!user) {
    throw new AppError(
      "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.",
      400,
      "BAD_REQUEST",
    );
  }

  if (user.status === "INACTIVE") {
    throw new AppError("Tài khoản đã bị vô hiệu hóa.", 403, "FORBIDDEN");
  }

  return user;
};

exports.forgotPassword = async (email) => {
  if (!email) {
    throw new AppError("Vui lòng nhập email.", 400, "BAD_REQUEST");
  }

  const user = await User.findOne({ email });

  if (!user || user.status === "INACTIVE") {
    throw new AppError(
      "Không tìm thấy tài khoản hoặc tài khoản đã bị vô hiệu hóa.",
      404,
      "NOT_FOUND",
    );
  }

  const resetToken = crypto.randomBytes(32).toString("hex");

  user.reset_password_token = hashToken(resetToken);
  user.reset_password_expires =
    Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000;

  await user.save();

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const resetLink = `${frontendUrl}/reset-password?token=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(email)}`;

  const emailHtml = `
    <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,.1);">
        <div style="background-color:#4F46E5;padding:30px 20px;text-align:center;">
            <h1 style="color:white;margin:0;font-size:28px;letter-spacing:1px;">FluxBoard</h1>
        </div>

        <div style="padding:40px 30px;background-color:#ffffff;">
            <h2 style="color:#1f2937;margin-top:0;">Yêu cầu đặt lại mật khẩu</h2>

            <p style="color:#4b5563;line-height:1.6;font-size:16px;">
                Xin chào <strong>${user.full_name || user.email}</strong>,
            </p>

            <p style="color:#4b5563;line-height:1.6;font-size:16px;">
                Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản FluxBoard của bạn.
                Vui lòng nhấn nút bên dưới để tạo mật khẩu mới.
            </p>

            <div style="text-align:center;margin:40px 0;">
                <a href="${resetLink}" style="background-color:#4F46E5;color:white;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:600;font-size:16px;display:inline-block;">
                    🔑 Đặt lại mật khẩu
                </a>
            </div>

            <p style="color:#4b5563;line-height:1.6;font-size:14px;">
                <em>
                    Liên kết này sẽ hết hạn sau <strong>${RESET_TOKEN_TTL_MINUTES} phút</strong>.
                    Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
                </em>
            </p>
        </div>

        <div style="background-color:#f9fafb;padding:20px;text-align:center;font-size:13px;color:#9ca3af;border-top:1px solid #e5e7eb;">
            Đây là email tự động từ hệ thống FluxBoard. Vui lòng không trả lời email này.
            <br><br>
            &copy; ${new Date().getFullYear()} FluxBoard Team. Tất cả quyền được bảo lưu.
        </div>
    </div>
    `;

  await emailService.sendEmail(
    user.email,
    "[FluxBoard] Yêu cầu đặt lại mật khẩu",
    emailHtml,
  );
};

exports.verifyResetToken = async (email, token) => {
  await findResetUser(email, token);
  return true;
};

exports.resetPassword = async (email, token, newPassword) => {
  if (!newPassword) {
    throw new AppError("Vui lòng nhập mật khẩu mới.", 400, "BAD_REQUEST");
  }

  const user = await findResetUser(email, token);

  user.password_hash = await bcrypt.hash(newPassword, 10);
  user.password = undefined;
  user.reset_password_token = undefined;
  user.reset_password_expires = undefined;

  await user.save();

  return true;
};
