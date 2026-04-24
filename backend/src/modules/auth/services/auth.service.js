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

    const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: '7d', 
        issuer: process.env.JWT_ISSUER
    });

    delete user.password_hash;
    return { user, token, refreshToken };
};

exports.refreshToken = async (refreshToken) => {
    try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).lean();
        
        if (!user || user.status === 'INACTIVE') {
            throw new AppError('Invalid token or inactive account', 401, 'UNAUTHORIZED');
        }

        const newToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRATION_MINUTES + 'm',
            issuer: process.env.JWT_ISSUER
        });

        return { token: newToken };
    } catch (error) {
        throw new AppError('Invalid or expired refresh token', 401, 'UNAUTHORIZED');
    }
};