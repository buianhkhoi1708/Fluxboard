const userService = require('../services/user.service');

exports.getUserById = async (req, res, next) => {
    try {
        const user = await userService.getUserById(req.params.id);
        res.status(200).json({ success: true, data: user });
    } catch (error) { 
        next(error); 
    }
};

exports.getCurrentProfile = async (req, res, next) => {
    try {
        const user = await userService.getCurrentProfile(req.user.id);
        res.status(200).json({ success: true, data: user });
    } catch (error) { 
        next(error); 
    }
};

exports.updateProfile = async (req, res, next) => {
    try {
        const user = await userService.updateProfile(req.user.id, req.body);
        res.status(200).json({ success: true, data: user });
    } catch (error) { 
        next(error); 
    }
};

exports.changePassword = async (req, res, next) => {
    try {
        const { oldPassword, newPassword } = req.body;
        
        if (!oldPassword || !newPassword) {
            return res.status(400).json({ 
                success: false, 
                error: { message: 'Old and new passwords are required' }
            });
        }
        
        await userService.changePassword(req.user.id, oldPassword, newPassword);
        res.status(200).json({ success: true, message: 'Password changed successfully' });
    } catch (error) { 
        next(error); 
    }
};