const User = require('../models/user.model');
const Team = require('../../team/models/team.model');
const activityService = require('../../activity/services/activity.service');
const eventBus = require('../../../common/utils/eventBus');
const AppError = require('../../../common/exceptions/AppError');
const bcrypt = require('bcryptjs');

// ==========================================
// 1. QUẢN LÝ TÀI KHOẢN HỆ THỐNG TRUNG TÂM
// ==========================================
exports.getUserById = async (userId) => {
    const user = await User.findById(userId).lean();
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');
    return user;
};

exports.createUser = async ({ full_name, email, password, role_id }) => {
    if (!full_name || !email || !password || !role_id) {
        throw new AppError('Please provide all required fields', 400, 'BAD_REQUEST');
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw new AppError('Email is already in use within the system', 409, 'CONFLICT');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
        full_name,
        email,
        password_hash: hashedPassword,
        role_id,
        status: 'ACTIVE' 
    });

    newUser.password_hash = undefined;
    newUser.password = undefined;
    
    return newUser;
};

// ==========================================
// 2. NGHIỆP VỤ TỔ CHỨC & PHÒNG BAN (ORGANIZATION)
// ==========================================
exports.getUnassignedUsers = async () => {
    // Tìm nhân sự hoạt động chưa được gán vào bất kỳ nhóm (Team) nào
    return await User.find({ status: 'ACTIVE', team_id: null })
        .select('_id full_name email role_id avatar_url')
        .lean();
};

exports.assignTeam = async (userId, teamId, actorId) => {
    const team = await Team.findById(teamId).lean();
    if (!team) throw new AppError('Team not found', 404, 'TEAM_NOT_FOUND');

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

    // Ghi log hoạt động hệ thống ngầm
    await activityService.logActivity({
        action: 'UPDATE',
        source: 'USER',
        actor_id: actorId,
        target_id: user._id,
        target_type: 'User',
        details: { message: `Assigned user to team: ${team.name}` }
    });

    // Kích hoạt sự kiện cập nhật cấu trúc tổ chức thời gian thực
    eventBus.emit('ORGANIZATION_UPDATED', { 
        type: 'MEMBER_ASSIGNED', 
        userId: user._id, 
        teamId: team._id 
    });

    return user;
};

// ==========================================
// 3. THU HỒI TRUY CẬP VÀ ĐÌNH CHỈ QUYỀN HẠN
// ==========================================
exports.revokeAccess = async (userId, actorId) => {
    const user = await User.findByIdAndUpdate(userId, { $set: { status: 'INACTIVE' } });
    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

    // Gửi tín hiệu đăng xuất cưỡng chế cho authSocket.listener xử lý qua Socket.io
    eventBus.emit('USER_REVOKED', { 
        userId, 
        reason: 'Your access has been revoked by an administrator.' 
    });

    return { success: true };
};