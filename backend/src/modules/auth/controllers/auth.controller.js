const authService = require('../services/auth.service');
const passwordService = require('../services/password.service');

exports.login = async (req, res, next) => {
    try {
        const data = await authService.login(req.body.email, req.body.password);
        res.status(200).json({ success: true, data });
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
        const { email, token, newPassword } = req.body;
        await passwordService.resetPassword(email, token, newPassword);
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