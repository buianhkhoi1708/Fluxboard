const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../../user/models/user.model');
const AppError = require('../../../common/exceptions/AppError');

exports.login = async (email, password) => {
    const user = await User.findOne({ email }).select('+password_hash').lean();
    if (!user || user.status === 'INACTIVE') {
        throw new AppError('Invalid credentials', 401, 'UNAUTHORIZED');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) throw new AppError('Invalid credentials', 401, 'UNAUTHORIZED');

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRATION_MINUTES + 'm',
        issuer: process.env.JWT_ISSUER
    });

    delete user.password_hash;
    return { user, token };
};