const User = require('../models/user.model');
const AppError = require('../../../common/exceptions/AppError');

exports.getUserById = async (userId) => {
    const user = await User.findById(userId).populate('system_role_ids', 'name').lean();
    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    return user;
};