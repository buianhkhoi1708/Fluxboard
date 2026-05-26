const User = require('../../user/models/user.model');
const Activity = require('../../activity/models/activity.model');
const UserNotificationPref = require('../../user/models/userNotificationPref.model');
const UserSession = require('../models/userSession.model');
const activityService = require('../../activity/services/activity.service');

const AppError = require('../../../common/exceptions/AppError');
const eventBus = require('../../../common/utils/eventBus');

const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const crypto = require('crypto');

const NOTIFICATION_DEFAULTS = {
    email_notifications: true,
    push_notifications: true,
    task_deadline_reminders: true,
};

const normalizeNotificationPrefs = (pref) => {
    return {
        email_notifications: pref?.email_notifications ?? true,
        push_notifications: pref?.push_notifications ?? true,
        task_deadline_reminders: pref?.task_deadline_reminders ?? true,
    };
};

const normalizeRoleName = (value) => {
    if (!value) return '';

    return String(value)
        .trim()
        .toUpperCase()
        .replace(/\s+/g, '_')
        .replace(/-/g, '_');
};

const getRoleNameFromUser = (user) => {
    if (!user) return 'UNKNOWN_ROLE';

    const directRole =
        user.role_name ||
        user.roleName ||
        user.system_role ||
        user.systemRole ||
        user.role ||
        user.role_code ||
        user.roleCode;

    if (directRole) {
        return normalizeRoleName(directRole);
    }

    if (user.role_id && typeof user.role_id === 'object') {
        return normalizeRoleName(user.role_id.name || user.role_id.code);
    }

    return 'UNKNOWN_ROLE';
};

const logSettingActivity = async (payload) => {
    try {
        await activityService.logActivity(payload);
    } catch (error) {
        console.warn('[setting.service] Failed to log activity:', error.message);
    }
};

// ====================================================
// LUỒNG 1: XỬ LÝ HỒ SƠ & TRÍCH XUẤT TỔ CHỨC
// ====================================================

exports.getProfileOverview = async (userId) => {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const profileData = await User.aggregate([
        { $match: { _id: userObjectId } },

        {
            $lookup: {
                from: 'departments',
                localField: 'department_id',
                foreignField: '_id',
                as: 'department',
            },
        },
        {
            $unwind: {
                path: '$department',
                preserveNullAndEmptyArrays: true,
            },
        },

        {
            $lookup: {
                from: 'teams',
                localField: 'team_id',
                foreignField: '_id',
                as: 'team',
            },
        },
        {
            $unwind: {
                path: '$team',
                preserveNullAndEmptyArrays: true,
            },
        },

        {
            $lookup: {
                from: 'projectmembers',
                let: { currentUserId: '$_id' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $eq: ['$user_id', '$$currentUserId'],
                            },
                            is_active: true,
                        },
                    },
                    {
                        $lookup: {
                            from: 'projects',
                            localField: 'project_id',
                            foreignField: '_id',
                            as: 'project',
                        },
                    },
                    {
                        $unwind: {
                            path: '$project',
                            preserveNullAndEmptyArrays: true,
                        },
                    },
                ],
                as: 'projects',
            },
        },

        {
            $project: {
                _id: 0,
                user_id: '$_id',
                full_name: 1,
                email: 1,
                avatar_url: 1,

                department: {
                    id: '$department._id',
                    name: '$department.name',
                    code: '$department.code',
                },

                team: {
                    id: '$team._id',
                    name: '$team.name',
                },

                joined_projects: {
                    $map: {
                        input: '$projects',
                        as: 'p',
                        in: {
                            project_id: '$$p.project_id',
                            name: '$$p.project.name',
                            status: {
                                $cond: [
                                    { $eq: ['$$p.is_active', true] },
                                    'ACTIVE',
                                    'SUSPENDED',
                                ],
                            },
                        },
                    },
                },
            },
        },
    ]);

    if (!profileData || profileData.length === 0) {
        throw new AppError('User profile not found.', 404, 'NOT_FOUND');
    }

    return profileData[0];
};

exports.updateProfileInfo = async (userId, payload) => {
    const { full_name, avatar_url } = payload;
    const updateFields = {};

    if (full_name !== undefined) {
        if (!String(full_name).trim()) {
            throw new AppError('Name cannot be empty.', 400, 'BAD_REQUEST');
        }

        updateFields.full_name = String(full_name).trim();
    }

    if (avatar_url !== undefined) {
        updateFields.avatar_url = avatar_url;
    }

    const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
            $set: updateFields,
        },
        {
            new: true,
        },
    )
        .select('full_name avatar_url email role_id')
        .populate('role_id', 'name scope');

    await logSettingActivity({
        actor_id: userId,
        source: 'USER',
        action: 'UPDATE',
        target_id: userId,
        target_type: 'User',
        details: {
            message: 'Người dùng đã cập nhật thông tin hồ sơ cá nhân',
            user_role: getRoleNameFromUser(updatedUser),
        },
    });

    return updatedUser;
};

// ====================================================
// LUỒNG 2 & LUỒNG 5: TRUNG TÂM BẢO MẬT & QUẢN LÝ PHIÊN
// ====================================================

exports.changePassword = async (userId, payload) => {
    const { currentPassword, newPassword } = payload;

    if (!currentPassword || !newPassword) {
        throw new AppError(
            'Current password and new password are required.',
            400,
            'BAD_REQUEST',
        );
    }

    if (!/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(newPassword)) {
        throw new AppError(
            'Password must be at least 8 characters, include 1 uppercase and 1 number.',
            400,
            'BAD_REQUEST',
        );
    }

    const user = await User.findById(userId)
        .select('+password_hash +password full_name email role_id')
        .populate('role_id', 'name scope');

    if (!user) {
        throw new AppError('User not found.', 404, 'NOT_FOUND');
    }

    const hashToCompare = user.password_hash || user.password;

    if (!hashToCompare) {
        throw new AppError(
            'Account has no password set. Please reset password.',
            400,
            'BAD_REQUEST',
        );
    }

    const isMatch = await bcrypt.compare(currentPassword, hashToCompare);

    if (!isMatch) {
        throw new AppError('Current password is incorrect.', 400, 'BAD_REQUEST');
    }

    const salt = await bcrypt.genSalt(10);

    user.password_hash = await bcrypt.hash(newPassword, salt);
    user.password = undefined;

    await user.save();

    await UserSession.updateMany(
        {
            user_id: userId,
        },
        {
            $set: {
                is_active: false,
                last_activity: new Date(),
            },
        },
    );

    await logSettingActivity({
        actor_id: userId,
        source: 'SECURITY',
        action: 'CHANGE_PASSWORD',
        target_id: userId,
        target_type: 'User',
        details: {
            message: `Người dùng ${user.full_name} đã đổi mật khẩu`,
            user_id: String(user._id),
            user_email: user.email,
            user_role: getRoleNameFromUser(user),
        },
    });

    eventBus.emit('USER_PASSWORD_CHANGED', {
        userId: user._id,
        role: getRoleNameFromUser(user),
    });
};

exports.getActiveSessions = async (userId) => {
    return await UserSession.find({
        user_id: userId,
        is_active: true,
    })
        .select('device_type user_agent ip_address last_activity created_at')
        .sort({ last_activity: -1 })
        .lean();
};

exports.signOutAllSessions = async (userId, currentToken) => {
    const query = { user_id: userId };

    if (currentToken) {
        const tokenHash = crypto
            .createHash('sha256')
            .update(currentToken)
            .digest('hex');

        query.token_hash = {
            $ne: tokenHash,
        };
    }

    await UserSession.updateMany(
        query,
        {
            $set: {
                is_active: false,
                last_activity: new Date(),
            },
        },
    );
};

exports.revokeSessionById = async (userId, sessionId) => {
    const result = await UserSession.updateOne(
        {
            _id: sessionId,
            user_id: userId,
        },
        {
            $set: {
                is_active: false,
                last_activity: new Date(),
            },
        },
    );

    if (result.modifiedCount === 0) {
        throw new AppError('Session not found or already expired.', 404, 'NOT_FOUND');
    }
};

// ====================================================
// LUỒNG 3: CẤU HÌNH THÔNG BÁO
// ====================================================

exports.getNotificationSettings = async (userId) => {
    let pref = await UserNotificationPref.findOne({
        user_id: userId,
    }).lean();

    if (!pref) {
        pref = await UserNotificationPref.create({
            user_id: userId,
            ...NOTIFICATION_DEFAULTS,
        });

        pref = pref.toObject();
    }

    return normalizeNotificationPrefs(pref);
};

exports.updateNotificationSettings = async (userId, payload) => {
    const allowedKeys = [
        'email_notifications',
        'push_notifications',
        'task_deadline_reminders',
    ];

    const updateData = {};

    for (const key of allowedKeys) {
        if (payload[key] !== undefined) {
            updateData[key] = !!payload[key];
        }
    }

    if (Object.keys(updateData).length === 0) {
        throw new AppError(
            'No valid preferences parameters provided.',
            400,
            'BAD_REQUEST',
        );
    }

    const updatedPref = await UserNotificationPref.findOneAndUpdate(
        {
            user_id: userId,
        },
        {
            $set: {
                ...updateData,
            },
            $setOnInsert: {
                user_id: userId,
            },
        },
        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
        },
    ).lean();

    await logSettingActivity({
        actor_id: userId,
        source: 'USER',
        action: 'UPDATE',
        target_id: userId,
        target_type: 'UserNotificationPref',
        details: {
            message: 'Người dùng đã cập nhật cấu hình thông báo',
        },
    });

    return normalizeNotificationPrefs(updatedPref);
};

// ====================================================
// LUỒNG 4 & LUỒNG 6: 2FA & AUDIT LOGS
// ====================================================

exports.generate2FASecret = async (userId) => {
    const tempSecret = Math.random()
        .toString(36)
        .substring(2, 12)
        .toUpperCase();

    return {
        secret: tempSecret,
        qr_code_placeholder: `otpauth://totp/Fluxboard:${userId}?secret=${tempSecret}&issuer=Fluxboard`,
    };
};

exports.toggle2FA = async (userId, enable, code) => {
    if (enable && code !== '123456') {
        throw new AppError('Invalid authentication code.', 400, 'BAD_REQUEST');
    }

    const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
            $set: {
                is_2fa_enabled: !!enable,
            },
        },
        {
            new: true,
        },
    ).select('is_2fa_enabled role_id full_name email')
        .populate('role_id', 'name scope');

    await logSettingActivity({
        actor_id: userId,
        source: 'SECURITY',
        action: 'UPDATE',
        target_id: userId,
        target_type: 'User',
        details: {
            message: enable
                ? 'Người dùng đã bật xác thực hai lớp'
                : 'Người dùng đã tắt xác thực hai lớp',
            user_role: getRoleNameFromUser(updatedUser),
        },
    });

    return updatedUser;
};

exports.getSecurityLogs = async (userId) => {
    const logs = await Activity.find({
        actor_id: userId,
        $or: [
            { source: 'SECURITY' },
            {
                action: {
                    $in: ['CHANGE_PASSWORD', 'CREATE_USER', 'REVOKE_ACCESS', 'LOGIN', 'LOGOUT'],
                },
            },
        ],
    })
        .populate({
            path: 'actor_id',
            select: 'full_name email avatar_url role_id',
            populate: {
                path: 'role_id',
                select: 'name scope',
            },
        })
        .sort({ created_at: -1 })
        .limit(20)
        .lean();

    return logs.map((log) => ({
        id: log._id,
        _id: log._id,
        action: log.action,
        source_type: log.source,
        source: log.source,
        message: log.details?.message || 'Có một sự kiện bảo mật',
        details: log.details || {},
        created_at: log.created_at,
        actor: log.actor_id
            ? {
                user_id: log.actor_id._id,
                id: log.actor_id._id,
                _id: log.actor_id._id,
                full_name: log.actor_id.full_name,
                email: log.actor_id.email,
                avatar_url: log.actor_id.avatar_url,
                role_id: log.actor_id.role_id,
                role_name: getRoleNameFromUser(log.actor_id),
                system_role: getRoleNameFromUser(log.actor_id),
            }
            : null,
    }));
};