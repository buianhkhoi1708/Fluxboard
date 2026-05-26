const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const User = require('../../user/models/user.model');
const AppError = require('../../../common/exceptions/AppError');

const getJwtVerifyOptions = () => {
    const options = {};

    if (process.env.JWT_ISSUER) {
        options.issuer = process.env.JWT_ISSUER;
    }

    return options;
};

const getJwtSignOptions = (expiresIn) => {
    const options = {
        expiresIn
    };

    if (process.env.JWT_ISSUER) {
        options.issuer = process.env.JWT_ISSUER;
    }

    return options;
};

const getSafeUser = (user) => {
    const id = user._id || user.id;

    return {
        id,
        _id: id,
        user_id: id,

        email: user.email,

        full_name: user.full_name || user.fullName || user.name || 'Người dùng',
        fullName: user.fullName || user.full_name || user.name || 'Người dùng',

        avatar_url: user.avatar_url || user.avatarUrl || null,
        avatarUrl: user.avatarUrl || user.avatar_url || null,

        department_id: user.department_id || user.departmentId || null,
        departmentId: user.departmentId || user.department_id || null,

        role_id: user.role_id || null,
        system_role: user.system_role || user.role || null,

        status: user.status
    };
};

const generateTokenPayload = (user) => {
    const id = user._id || user.id;

    return {
        id,
        _id: id,
        user_id: id,

        email: user.email,
        department_id: user.department_id || null,
        role_id: user.role_id || null,
        system_role: user.system_role || user.role || null
    };
};

const signAccessToken = (user) => {
    const payload = generateTokenPayload(user);

    return jwt.sign(
        payload,
        process.env.JWT_SECRET,
        getJwtSignOptions(process.env.JWT_ACCESS_EXPIRES_IN || '15m')
    );
};

const signRefreshToken = (user) => {
    const id = user._id || user.id;

    return jwt.sign(
        {
            id,
            _id: id,
            user_id: id,
            token_type: 'refresh'
        },
        process.env.JWT_SECRET,
        getJwtSignOptions(process.env.JWT_REFRESH_EXPIRES_IN || '7d')
    );
};

const validateActiveUser = (user) => {
    if (!user) {
        throw new AppError('Invalid credentials', 401, 'UNAUTHORIZED');
    }

    if (user.status === 'INACTIVE' || user.status === 'DISABLED' || user.is_deleted) {
        throw new AppError('Tài khoản đã bị khóa hoặc không tồn tại', 401, 'UNAUTHORIZED');
    }
};

exports.login = async (email, password) => {
    if (!email || !password) {
        throw new AppError('Email and password are required', 400, 'BAD_REQUEST');
    }

    const user = await User.findOne({ email })
        .select('+password_hash +password')
        .lean();

    validateActiveUser(user);

    const hashToCompare = user.password_hash || user.password;

    if (!hashToCompare) {
        throw new AppError(
            'Account has no password set. Please reset password.',
            401,
            'UNAUTHORIZED'
        );
    }

    const isMatch = await bcrypt.compare(password, hashToCompare);

    if (!isMatch) {
        throw new AppError('Invalid credentials', 401, 'UNAUTHORIZED');
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    return {
        user: getSafeUser(user),
        accessToken,
        refreshToken
    };
};

exports.refreshToken = async (token) => {
    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET,
            getJwtVerifyOptions()
        );

        const userId =
            decoded.id ||
            decoded._id ||
            decoded.user_id;

        if (!userId) {
            throw new AppError('Invalid refresh token', 401, 'UNAUTHORIZED');
        }

        const user = await User.findById(userId).lean();

        validateActiveUser(user);

        const accessToken = signAccessToken(user);

        // Rotate refresh token để phiên sạch hơn.
        const refreshToken = signRefreshToken(user);

        return {
            user: getSafeUser(user),
            accessToken,
            refreshToken
        };
    } catch (error) {
        throw new AppError(
            'Phiên đăng nhập hết hạn, vui lòng đăng nhập lại',
            401,
            'UNAUTHORIZED'
        );
    }
};