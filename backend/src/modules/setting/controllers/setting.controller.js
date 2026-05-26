const settingService = require('../services/setting.service');

const getAuthUserId = (req) => {
    return req.user?._id || req.user?.id;
};

exports.getProfileOverview = async (req, res, next) => {
    try {
        const userId = getAuthUserId(req);

        const data = await settingService.getProfileOverview(userId);

        res.status(200).json({
            success: true,
            code: 'SUCCESS',
            data
        });
    } catch (error) {
        next(error);
    }
};

exports.updateProfileInfo = async (req, res, next) => {
    try {
        const userId = getAuthUserId(req);

        const data = await settingService.updateProfileInfo(userId, req.body);

        res.status(200).json({
            success: true,
            code: 'SUCCESS',
            message: 'Profile updated successfully.',
            data
        });
    } catch (error) {
        next(error);
    }
};

exports.changePassword = async (req, res, next) => {
    try {
        const userId = getAuthUserId(req);

        await settingService.changePassword(userId, req.body);

        res.status(200).json({
            success: true,
            code: 'SUCCESS',
            message: 'Password changed successfully.'
        });
    } catch (error) {
        next(error);
    }
};

exports.getActiveSessions = async (req, res, next) => {
    try {
        const userId = getAuthUserId(req);

        const data = await settingService.getActiveSessions(userId);

        res.status(200).json({
            success: true,
            code: 'SUCCESS',
            data
        });
    } catch (error) {
        next(error);
    }
};

exports.signOutAllSessions = async (req, res, next) => {
    try {
        const userId = getAuthUserId(req);
        const currentSessionToken = req.headers.authorization?.split(' ')[1];

        await settingService.signOutAllSessions(userId, currentSessionToken);

        res.status(200).json({
            success: true,
            code: 'SUCCESS',
            message: 'All other sessions terminated.'
        });
    } catch (error) {
        next(error);
    }
};

exports.revokeSessionById = async (req, res, next) => {
    try {
        const userId = getAuthUserId(req);
        const { sessionId } = req.params;

        await settingService.revokeSessionById(userId, sessionId);

        res.status(200).json({
            success: true,
            code: 'SUCCESS',
            message: 'Session revoked successfully.'
        });
    } catch (error) {
        next(error);
    }
};

exports.getNotificationSettings = async (req, res, next) => {
    try {
        const userId = getAuthUserId(req);

        const data = await settingService.getNotificationSettings(userId);

        res.status(200).json({
            success: true,
            code: 'SUCCESS',
            data
        });
    } catch (error) {
        next(error);
    }
};

exports.updateNotificationSettings = async (req, res, next) => {
    try {
        const userId = getAuthUserId(req);

        const data = await settingService.updateNotificationSettings(userId, req.body);

        res.status(200).json({
            success: true,
            code: 'SUCCESS',
            message: 'Notification preferences updated.',
            data
        });
    } catch (error) {
        next(error);
    }
};

exports.setup2FA = async (req, res, next) => {
    try {
        const userId = getAuthUserId(req);

        const data = await settingService.generate2FASecret(userId);

        res.status(200).json({
            success: true,
            code: 'SUCCESS',
            data
        });
    } catch (error) {
        next(error);
    }
};

exports.toggle2FA = async (req, res, next) => {
    try {
        const userId = getAuthUserId(req);
        const { enable, code } = req.body;

        const data = await settingService.toggle2FA(userId, enable, code);

        res.status(200).json({
            success: true,
            code: 'SUCCESS',
            message: `2FA status set to ${enable}`,
            data
        });
    } catch (error) {
        next(error);
    }
};

exports.getSecurityLogs = async (req, res, next) => {
    try {
        const userId = getAuthUserId(req);

        const data = await settingService.getSecurityLogs(userId);

        res.status(200).json({
            success: true,
            code: 'SUCCESS',
            data
        });
    } catch (error) {
        next(error);
    }
};