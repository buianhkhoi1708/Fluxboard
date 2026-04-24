const User = require('../models/user.model');
const bcrypt = require('bcrypt');
const AppError = require('../../../common/exceptions/AppError');

exports.getUserById = async (userId) => {
    const user = await User.findById(userId).populate('system_role_ids', 'name').lean();
    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    return user;
};

// Lấy thông tin chính mình
exports.getCurrentProfile = async (userId) => {
    const user = await User.findById(userId).populate('system_role_ids', 'name').lean();
    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    return user;
};

// Cập nhật thông tin cơ bản
exports.updateProfile = async (userId, updateData) => {
    const allowedUpdates = { full_name: updateData.full_name, avatar_url: updateData.avatar_url };
    const user = await User.findByIdAndUpdate(userId, { $set: allowedUpdates }, { new: true }).lean();
    return user;
};

// Đổi mật khẩu chủ động
exports.changePassword = async (userId, oldPassword, newPassword) => {
    const user = await User.findById(userId).select('+password_hash');
    const isMatch = await bcrypt.compare(oldPassword, user.password_hash);
    
    if (!isMatch) throw new AppError('Incorrect old password', 400, 'BAD_REQUEST');
    
    user.password_hash = await bcrypt.hash(newPassword, 10);
    await user.save();
    return true;
};