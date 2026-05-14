const userService = require('../services/user.service');

// 1. PROFILE CORE
exports.getUserById = async (req, res, next) => {
    try {
        const user = await userService.getUserById(req.params.id);
        res.status(200).json({ success: true, data: user });
    } catch (error) { next(error); }
};

exports.getCurrentProfile = async (req, res, next) => {
    try {
        const user = await userService.getCurrentProfile(req.user.id);
        res.status(200).json({ success: true, data: user });
    } catch (error) { next(error); }
};

exports.updateProfile = async (req, res, next) => {
    try {
        const user = await userService.updateProfile(req.user.id, req.body);
        res.status(200).json({ success: true, data: user });
    } catch (error) { next(error); }
};

exports.changePassword = async (req, res, next) => {
    try {
        const { oldPassword, newPassword } = req.body;
        if (!oldPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Old and new passwords are required' });
        }
        await userService.changePassword(req.user.id, oldPassword, newPassword);
        res.status(200).json({ success: true, message: 'Password changed successfully' });
    } catch (error) { next(error); }
};

// 2. ORGANIZATION (ĐỢT 1)
exports.getUnassignedUsers = async (req, res, next) => {
    try {
        const users = await userService.getUnassignedUsers();
        res.status(200).json({ success: true, data: users });
    } catch (error) { next(error); }
};

exports.assignToTeam = async (req, res, next) => {
    try {
        const { team_id } = req.body;
        if (!team_id) return res.status(400).json({ success: false, message: 'Missing team_id' });
        
        const user = await userService.assignTeam(req.params.id, team_id, req.user.id);
        res.status(200).json({ success: true, data: user, message: 'User assigned to team' });
    } catch (error) { next(error); }
};

// 3. PREFERENCES (ĐỢT 2)
exports.getPreferences = async (req, res, next) => {
    try {
        const prefs = await userService.getNotificationPreferences(req.user.id);
        res.status(200).json({ success: true, data: prefs });
    } catch (error) { next(error); }
};

exports.updatePreferences = async (req, res, next) => {
    try {
        const prefs = await userService.updateNotificationPreferences(req.user.id, req.body);
        res.status(200).json({ success: true, data: prefs, message: 'Preferences updated' });
    } catch (error) { next(error); }
};