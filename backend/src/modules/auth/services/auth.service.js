const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../../user/models/user.model');
const AppError = require('../../../common/exceptions/AppError');

const getSafeUser = (user) => ({
    _id: user._id,
    email: user.email,
    full_name: user.full_name,
    avatar_url: user.avatar_url,
    department_id: user.department_id,
    system_role_ids: user.system_role_ids,
    status: user.status
});

exports.login = async (email, password) => {
    if (!email || !password) {
        throw new AppError('Email and password are required', 400, 'BAD_REQUEST');
    }

    const user = await User.findOne({ email })
        .select('+password_hash +password') 
        .lean();

    if (!user || user.status === 'INACTIVE') {
        throw new AppError('Invalid credentials', 401, 'UNAUTHORIZED');
    }
    const hashToCompare = user.password_hash || user.password;
    
    if (!hashToCompare) {
        throw new AppError('Account has no password set. Please reset password.', 401, 'UNAUTHORIZED');
    }

    const isMatch = await bcrypt.compare(password, hashToCompare);
    if (!isMatch) {
        throw new AppError('Invalid credentials', 401, 'UNAUTHORIZED');
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: (process.env.JWT_EXPIRATION_MINUTES || 60) + 'm',
        issuer: process.env.JWT_ISSUER
    });

    const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: '7d', 
        issuer: process.env.JWT_ISSUER
    });

    return { 
        user: getSafeUser(user), 
        token, 
        refreshToken 
    };
};

exports.refreshToken = async (token) => {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).lean();
        
        if (!user || user.status === 'INACTIVE') {
            throw new AppError('Invalid account', 401, 'UNAUTHORIZED');
        }
        
        const newToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: (process.env.JWT_EXPIRATION_MINUTES || 60) + 'm',
            issuer: process.env.JWT_ISSUER
        });

        return { 
            token: newToken, 
            user: getSafeUser(user) 
        };
    } catch (error) {
        throw new AppError('Invalid or expired token', 401, 'UNAUTHORIZED');
    }
};