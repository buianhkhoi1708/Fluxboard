const authService = require('../services/auth.service');
const passwordService = require('../services/password.service');

exports.login = async (req, res, next) => {
    try {
        // Lấy data từ service (thường data này chứa { accessToken, user })
        const data = await authService.login(req.body.email, req.body.password);
        
        // Sửa dòng này: Phá vỡ lớp bọc 'data' và đẩy accessToken & user ra ngoài cùng
        res.status(200).json({ 
            success: true, 
            ...data  // Dấu 3 chấm này sẽ đưa accessToken và user ra ngang hàng với success
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
            message: 'Password reset link sent to email' 
        });
    } catch (error) { 
        next(error); 
    }
};


exports.resetPassword = async (req, res, next) => {
    try {
        // Đổi newPassword thành new_password để khớp với Frontend
        const { token, new_password } = req.body; 
        
        // Truyền thẳng token vào service, service sẽ tự giải mã token để lấy email/id
        await passwordService.resetPassword(token, new_password);
        
        res.status(200).json({ 
            success: true, 
            message: 'Password has been reset successfully' 
        });
    } catch (error) { 
        next(error); 
    }
};

exports.refreshToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        
        if (!refreshToken) {
            return res.status(400).json({ 
                success: false, 
                error: { message: 'Refresh token is required' }
            });
        }
        
        const data = await authService.refreshToken(refreshToken);
        res.status(200).json({ success: true, data });
    } catch (error) { 
        next(error); 
    }
};