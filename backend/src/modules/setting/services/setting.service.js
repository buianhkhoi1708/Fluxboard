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

// ====================================================
// LUỒNG 1: XỬ LÝ HỒ SƠ & TRÍCH XUẤT TỔ CHỨC (ORG TREE MINI)
// ====================================================
exports.getProfileOverview = async (userId) => {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Sử dụng duy nhất 1 câu lệnh tối ưu để gom toàn bộ dữ liệu tổ chức, nhóm, và dự án tham gia
    const profileData = await User.aggregate([
        { $match: { _id: userObjectId } },
        {
            $lookup: {
                from: 'departments',
                localField: 'department_id',
                foreignField: '_id',
                as: 'department'
            }
        },
        { $unwind: { path: '$department', preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: 'teams',
                localField: 'team_id',
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
                                { $match: { $expr: { $eq: ['$_id', { $toObjectId: '$$pId' }] } } }
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
                            status: { $cond: [{ $eq: ['$$p.is_active', true] }, 'ACTIVE', 'SUSPENDED'] }
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
        if (!full_name.trim()) throw new AppError('Name cannot be empty.', 400, 'BAD_REQUEST');
        updateFields.full_name = full_name;
    }
    if (avatar_url !== undefined) updateFields.avatar_url = avatar_url;

    const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: updateFields },
        { new: true }
    ).select('full_name avatar_url email');

    // Phát sự kiện ghi nhật ký hệ thống ngầm
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
    
    // Ràng buộc định dạng mật khẩu chuẩn ở BE
    if (!/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(newPassword)) {
        throw new AppError('Password must be at least 8 characters, include 1 uppercase and 1 number.', 400, 'BAD_REQUEST');
    }

    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found.', 404, 'NOT_FOUND');

    const isMatch = await bcrypt.compare(currentPassword, user.password || user.password_hash);
    if (!isMatch) throw new AppError('Current password is incorrect.', 400, 'BAD_REQUEST');

    const salt = await bcrypt.genSalt(10);
    user.password_hash = await bcrypt.hash(newPassword, salt);
    await user.save();

    // Hủy toàn bộ phiên làm việc khác khi đổi mật khẩu để đảm bảo an toàn thông tin
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
    return await UserSession.find({ user_id: userId, is_active: true })
        .select('device_type ip_address last_activity created_at')
        .sort({ last_activity: -1 })
        .lean();
};

exports.signOutAllSessions = async (userId, currentToken) => {
    // Xóa tất cả các phiên ngoại trừ phiên hiện tại đang thao tác
    const query = { user_id: userId };
    if (currentToken) {
        const tokenHash = crypto.createHash('sha256').update(currentToken).digest('hex');
        query.token_hash = { $ne: tokenHash };
    }
    await UserSession.deleteMany(query);
};

exports.revokeSessionById = async (userId, sessionId) => {
    const result = await UserSession.deleteOne({ _id: sessionId, user_id: userId });
    if (result.deletedCount === 0) {
        throw new AppError('Session not found or already expired.', 404, 'NOT_FOUND');
    }
};

// ====================================================
// LUỒNG 3: CẤU HÌNH THÔNG BÁO (NOTIFICATION PREFERENCES)
// ====================================================
exports.getNotificationSettings = async (userId) => {
    let pref = await UserNotificationPref.findOne({ user_id: userId }).lean();
    if (!pref) {
        // Tạo cấu hình mặc định nếu chưa tồn tại bản ghi
        pref = await UserNotificationPref.create({
            user_id: userId,
            task_assigned: true,
            deadline_reminder: true,
            mention_alert: true,
            system_announcement: true
        });
    }
    return pref;
};

exports.updateNotificationSettings = async (userId, payload) => {
    const allowedKeys = ['task_assigned', 'deadline_reminder', 'mention_alert', 'system_announcement'];
    const updateData = {};

    for (const key of allowedKeys) {
        if (payload[key] !== undefined) updateData[key] = !!payload[key];
    }

    return await UserNotificationPref.findOneAndUpdate(
        { user_id: userId },
        { $set: updateData },
        { new: true, upsert: true }
    ).lean();
};

// ====================================================
// LUỒNG 4 & LUỒNG 6: CÁC LUỒNG NÂNG CAO BỔ SUNG (2FA & AUDIT LOGS)
// ====================================================
exports.generate2FASecret = async (userId) => {
    // Stub logic sinh khóa bí mật cho cấu hình Google Authenticator QR Code
    const tempSecret = Math.random().toString(36).substring(2, 12).toUpperCase();
    return {
        secret: tempSecret,
        qr_code_placeholder: `otpauth://totp/Fluxboard:${userId}?secret=${tempSecret}&issuer=Fluxboard`
    };
};

exports.toggle2FA = async (userId, enable, code) => {
    if (enable && code !== '123456') { // Mock check kiểm thử mã số 2FA hệ thống
        throw new AppError('Invalid authentication code.', 400, 'BAD_REQUEST');
    }
    return await User.findByIdAndUpdate(userId, { $set: { is_2fa_enabled: !!enable } }, { new: true }).select('is_2fa_enabled');
};

exports.getSecurityLogs = async (userId) => {
    // Lọc riêng lịch sử thuộc loại đối tượng USER và liên quan hành vi cập nhật mật khẩu hệ thống
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