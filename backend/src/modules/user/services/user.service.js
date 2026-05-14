const User = require('../models/user.model');
const UserNotificationPref = require('../models/userNotificationPref.model');
const Team = require('../../team/models/team.model');
const activityService = require('../../activity/services/activity.service');
const eventBus = require('../../../common/utils/eventBus');
const AppError = require('../../../common/exceptions/AppError');

// ==========================================
// 1. QUẢN LÝ HỒ SƠ (PROFILE CORE)
// ==========================================
exports.getUserById = async (userId) => {
    const user = await User.findById(userId).lean();
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');
    return user;
};

exports.getCurrentProfile = async (userId) => {
    const user = await User.findById(userId)
        .populate('department_id', 'name code')
        .populate('team_id', 'name code')
        .populate('role_id', 'name')
        .lean();
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');
    return user;
};

exports.updateProfile = async (userId, updateData) => {
    const user = await User.findByIdAndUpdate(
        userId, 
        { $set: updateData }, 
        { new: true, runValidators: true }
    ).select('-password_hash -password');
    return user;
};

exports.changePassword = async (userId, oldPassword, newPassword) => {
    // Lưu ý: Phần này cần bcrypt (hoặc password service) để so sánh và hash lại mật khẩu
    // Đây là nơi bạn sẽ gọi logic kiểm tra mật khẩu cũ trước khi đổi
    return true; 
};

// ==========================================
// 2. NGHIỆP VỤ TỔ CHỨC (ORGANIZATION)
// ==========================================
exports.getUnassignedUsers = async () => {
    // Tìm lính mới chưa được gán vào bất kỳ Team nào
    return await User.find({ status: 'ACTIVE', team_id: null })
        .select('_id full_name email role_id avatar_url')
        .lean();
};

exports.assignTeam = async (userId, teamId, actorId) => {
    const team = await Team.findById(teamId).lean();
    if (!team) throw new AppError('Team not found', 404, 'TEAM_NOT_FOUND');

    // Cập nhật cả team_id và tự động map department_id để đồng bộ cây dữ liệu
    const user = await User.findByIdAndUpdate(
        userId,
        { 
            $set: { 
                team_id: team._id, 
                department_id: team.department_id 
            } 
        },
        { new: true, runValidators: true }
    ).select('_id full_name team_id department_id');

    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

    // 1. Ghi log hoạt động
    await activityService.logActivity({
        action: 'UPDATE',
        source: 'USER',
        actor_id: actorId,
        target_id: user._id,
        target_type: 'User',
        details: { message: `Assigned user to team: ${team.name}` }
    });

    // 2. Bắn sự kiện qua EventBus để Listener lo việc cập nhật UI real-time qua Socket
    eventBus.emit('ORGANIZATION_UPDATED', { 
        type: 'MEMBER_ASSIGNED', 
        userId: user._id, 
        teamId: team._id 
    });

    return user;
};

// ==========================================
// 3. TÙY CHỌN THÔNG BÁO (PREFERENCES)
// ==========================================
exports.getNotificationPreferences = async (userId) => {
    let prefs = await UserNotificationPref.findOne({ user_id: userId }).lean();
    if (!prefs) {
        // Tự động tạo bản ghi mặc định nếu chưa tồn tại
        prefs = await UserNotificationPref.create({ user_id: userId });
    }
    return prefs;
};

exports.updateNotificationPreferences = async (userId, prefData) => {
    return await UserNotificationPref.findOneAndUpdate(
        { user_id: userId },
        { $set: prefData },
        { new: true, upsert: true, runValidators: true }
    );
};

// ==========================================
// 4. BẢO MẬT & THU HỒI TRUY CẬP (SECURITY)
// ==========================================
exports.revokeAccess = async (userId, actorId) => {
    const user = await User.findByIdAndUpdate(userId, { $set: { status: 'INACTIVE' } });
    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

    // Bắn sự kiện USER_REVOKED. 
    // Listener authSocket.listener.js sẽ nghe thấy và bắn lệnh FORCE_LOGOUT qua Socket.io
    eventBus.emit('USER_REVOKED', { 
        userId, 
        reason: 'Your access has been revoked by an administrator.' 
    });

    return { success: true };
};