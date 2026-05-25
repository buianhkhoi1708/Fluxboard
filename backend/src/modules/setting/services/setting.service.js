const User = require('../../user/models/user.model');
const Department = require('../../department/models/department.model');
const Team = require('../../team/models/team.model');
const ProjectMember = require('../../projectMember/models/projectMember.model');
const Activity = require('../../activity/models/activity.model');
const UserNotificationPref = require('../../user/models/userNotificationPref.model');
const UserSession = require('../models/userSession.model');
const AppError = require('../../../common/exceptions/AppError');
const eventBus = require('../../../common/utils/eventBus');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const crypto = require('crypto');

const NOTIFICATION_DEFAULTS = {
    email_notifications: true,
    push_notifications: true,
    task_deadline_reminders: true
};

const normalizeNotificationPrefs = (pref) => {
    return {
        email_notifications: pref?.email_notifications ?? true,
        push_notifications: pref?.push_notifications ?? true,
        task_deadline_reminders: pref?.task_deadline_reminders ?? true
    };
};

// ====================================================
// LUỒNG 1: XỬ LÝ HỒ SƠ & TRÍCH XUẤT TỔ CHỨC
// ====================================================
exports.getProfileOverview = async (userId) => {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const profileData = await User.aggregate([
        { $match: { _id: userObjectId } },
        {
            $addFields: {
                dept_obj_id: {
                    $cond: {
                        if: {
                            $and: [
                                { $ifNull: ['$department_id', false] },
                                { $ne: ['$department_id', ''] }
                            ]
                        },
                        then: { $toObjectId: '$department_id' },
                        else: null
                    }
                },
                team_obj_id: {
                    $cond: {
                        if: {
                            $and: [
                                { $ifNull: ['$team_id', false] },
                                { $ne: ['$team_id', ''] }
                            ]
                        },
                        then: { $toObjectId: '$team_id' },
                        else: null
                    }
                }
            }
        },
        {
            $lookup: {
                from: 'departments',
                localField: 'dept_obj_id',
                foreignField: '_id',
                as: 'department'
            }
        },
        { $unwind: { path: '$department', preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: 'teams',
                localField: 'team_obj_id',
                foreignField: '_id',
                as: 'team'
            }
        },
        { $unwind: { path: '$team', preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: 'projectmembers',
                pipeline: [
                    { $match: { user_id: userId.toString(), is_deleted: false } },
                    {
                        $lookup: {
                            from: 'projects',
                            let: { pId: '$project_id' },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: {
                                            $eq: ['$_id', { $toObjectId: '$$pId' }]
                                        }
                                    }
                                }
                            ],
                            as: 'projDetails'
                        }
                    },
                    { $unwind: '$projDetails' }
                ],
                as: 'projects'
            }
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
                    code: '$department.code'
                },
                team: {
                    id: '$team._id',
                    name: '$team.name'
                },
                joined_projects: {
                    $map: {
                        input: '$projects',
                        as: 'p',
                        in: {
                            project_id: '$$p.project_id',
                            name: '$$p.projDetails.name',
                            status: {
                                $cond: [
                                    { $eq: ['$$p.is_active', true] },
                                    'ACTIVE',
                                    'SUSPENDED'
                                ]
                            }
                        }
                    }
                }
            }
        }
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
        if (!full_name.trim()) {
            throw new AppError('Name cannot be empty.', 400, 'BAD_REQUEST');
        }

        updateFields.full_name = full_name;
    }

    if (avatar_url !== undefined) {
        updateFields.avatar_url = avatar_url;
    }

    const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: updateFields },
        { new: true }
    ).select('full_name avatar_url email');

    eventBus.emit('activity_log', {
        actor_user_id: userId,
        source_type: 'USER',
        source_id: userId,
        action: 'UPDATE',
        message: 'Has updated profile personal information.'
    });

    return updatedUser;
};

// ====================================================
// LUỒNG 2 & LUỒNG 5: TRUNG TÂM BẢO MẬT & QUẢN LÝ PHIÊN
// ====================================================
exports.changePassword = async (userId, payload) => {
    const { currentPassword, newPassword } = payload;

    if (!/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(newPassword)) {
        throw new AppError(
            'Password must be at least 8 characters, include 1 uppercase and 1 number.',
            400,
            'BAD_REQUEST'
        );
    }

    const user = await User.findById(userId);

    if (!user) {
        throw new AppError('User not found.', 404, 'NOT_FOUND');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password || user.password_hash);

    if (!isMatch) {
        throw new AppError('Current password is incorrect.', 400, 'BAD_REQUEST');
    }

    const salt = await bcrypt.genSalt(10);
    user.password_hash = await bcrypt.hash(newPassword, salt);
    await user.save();

    await UserSession.deleteMany({ user_id: userId });

    eventBus.emit('activity_log', {
        actor_user_id: userId,
        source_type: 'USER',
        source_id: userId,
        action: 'UPDATE',
        message: 'Has successfully changed security password.'
    });
};

exports.getActiveSessions = async (userId) => {
    return await UserSession.find({
        user_id: userId,
        is_active: true
    })
        .select('device_type ip_address last_activity created_at')
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

        query.token_hash = { $ne: tokenHash };
    }

    await UserSession.deleteMany(query);
};

exports.revokeSessionById = async (userId, sessionId) => {
    const result = await UserSession.deleteOne({
        _id: sessionId,
        user_id: userId
    });

    if (result.deletedCount === 0) {
        throw new AppError('Session not found or already expired.', 404, 'NOT_FOUND');
    }
};

// ====================================================
// LUỒNG 3: CẤU HÌNH THÔNG BÁO
// ====================================================
exports.getNotificationSettings = async (userId) => {
    let pref = await UserNotificationPref.findOne({ user_id: userId }).lean();

    if (!pref) {
        pref = await UserNotificationPref.create({
            user_id: userId,
            ...NOTIFICATION_DEFAULTS
        });

        pref = pref.toObject();
    }

    return normalizeNotificationPrefs(pref);
};

exports.updateNotificationSettings = async (userId, payload) => {
    const allowedKeys = [
        'email_notifications',
        'push_notifications',
        'task_deadline_reminders'
    ];

    const updateData = {};

    for (const key of allowedKeys) {
        if (payload[key] !== undefined) {
            updateData[key] = !!payload[key];
        }
    }

    if (Object.keys(updateData).length === 0) {
        throw new AppError('No valid preferences parameters provided.', 400, 'BAD_REQUEST');
    }

    const updatedPref = await UserNotificationPref.findOneAndUpdate(
        { user_id: userId },
        {
            $set: {
                ...updateData
            },
            $setOnInsert: {
                user_id: userId
            }
        },
        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true
        }
    ).lean();

    eventBus.emit('activity_log', {
        actor_user_id: userId,
        source_type: 'USER',
        source_id: userId,
        action: 'UPDATE',
        message: 'Updated notification preferences.'
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
        qr_code_placeholder: `otpauth://totp/Fluxboard:${userId}?secret=${tempSecret}&issuer=Fluxboard`
    };
};

exports.toggle2FA = async (userId, enable, code) => {
    if (enable && code !== '123456') {
        throw new AppError('Invalid authentication code.', 400, 'BAD_REQUEST');
    }

    return await User.findByIdAndUpdate(
        userId,
        {
            $set: {
                is_2fa_enabled: !!enable
            }
        },
        {
            new: true
        }
    ).select('is_2fa_enabled');
};

exports.getSecurityLogs = async (userId) => {
    return await Activity.find({
        actor_user_id: userId,
        source_type: 'USER',
        is_deleted: false
    })
        .select('action message created_at')
        .sort({ created_at: -1 })
        .limit(10)
        .lean();
};