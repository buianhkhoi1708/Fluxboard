const authService = require("../services/auth.service");
const passwordService = require("../services/password.service");

exports.login = async (req, res, next) => {
  try {
    const data = await authService.login(
      req.body.email,
      req.body.password,
      req,
    );

    res.status(200).json({
      success: true,
      ...data,
      data,
    });
  } catch (error) {
    next(error);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    await passwordService.forgotPassword(req.body.email);

    res.status(200).json({
      success: true,
      message: "Đã gửi liên kết đặt lại mật khẩu tới email của bạn.",
    });
  } catch (error) {
    next(error);
  }
};

exports.verifyResetToken = async (req, res, next) => {
  try {
    const { token, email } = req.query;

    await passwordService.verifyResetToken(email, token);

    res.status(200).json({
      success: true,
      message: "Liên kết đặt lại mật khẩu hợp lệ.",
    });
  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { email, token, new_password, newPassword } = req.body;

    await passwordService.resetPassword(
      email,
      token,
      new_password || newPassword,
    );

    res.status(200).json({
      success: true,
      message: "Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.",
    });
  } catch (error) {
    next(error);
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const refreshToken = req.body.refreshToken || req.body.refresh_token;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Vui lòng cung cấp refresh token.",
        },
      });
    }

    const data = await authService.refreshToken(refreshToken, req);

    res.status(200).json({
      success: true,
      ...data,
      data,
    });
  } catch (error) {
    next(error);
  }
};
