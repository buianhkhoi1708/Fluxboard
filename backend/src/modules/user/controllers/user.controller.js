const userService = require('../services/user.service');
const bcrypt = require('bcryptjs');

// ==========================================
// 1. PROFILE CORE
// ==========================================
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
        const allowedFields = ['full_name', 'avatar_url'];
        const updateData = {};
        
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ success: false, message: 'No valid fields provided for update' });
        }

        const user = await userService.updateProfile(req.user.id, updateData);
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

// ==========================================
// 2. ORGANIZATION (ĐỢT 1)
// ==========================================
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

// ==========================================
// 3. PREFERENCES (ĐỢT 2)
// ==========================================
exports.getPreferences = async (req, res, next) => {
    try {
        const prefs = await userService.getNotificationPreferences(req.user.id);
        res.status(200).json({ success: true, data: prefs });
    } catch (error) { next(error); }
};

exports.updatePreferences = async (req, res, next) => {
    try {
        const allowedFields = [
            'email_notifications', 
            'push_notifications', 
            'task_deadline_reminders', 
            'daily_digest'
        ];
        const prefData = {};

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                prefData[field] = Boolean(req.body[field]); 
            }
        }

        if (Object.keys(prefData).length === 0) {
            return res.status(400).json({ success: false, message: 'No valid preferences provided' });
        }

        const prefs = await userService.updateNotificationPreferences(req.user.id, prefData);
        res.status(200).json({ success: true, data: prefs });
    } catch (error) { next(error); }
};

exports.createUser = async (req, res, next) => {
    try {
        // req.body chứa { full_name, email, password, role_id } từ frontend gửi lên
        const newUser = await userService.createUser(req.body);
        
        res.status(201).json({ 
            success: true, 
            data: newUser, 
            message: 'Tạo tài khoản thành công' 
        });
    } catch (error) { 
        next(error); 
    }
};