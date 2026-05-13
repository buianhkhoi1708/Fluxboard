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

const generateTokenPayload = (user) => ({
    id: user._id,
    email: user.email,
    system_role_ids: user.system_role_ids, 
    department_id: user.department_id      
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

    const payload = generateTokenPayload(user);

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: '15m',
        issuer: process.env.JWT_ISSUER
    });

    // Refresh Token sống 7 ngày (Chỉ chứa ID để ép quét lại Database khi hết hạn)
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
            throw new AppError('Tài khoản đã bị khóa hoặc không tồn tại', 401, 'UNAUTHORIZED');
        }
        
        const payload = generateTokenPayload(user);

        // 💡 Cấp lại Token 15 phút với dữ liệu mới nhất
        const newToken = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: '15m',
            issuer: process.env.JWT_ISSUER
        });

        return { 
            token: newToken, 
            user: getSafeUser(user) 
        };
    } catch (error) {
        throw new AppError('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại', 401, 'UNAUTHORIZED');
    }
};