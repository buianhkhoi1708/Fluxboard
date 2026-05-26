const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const User = require('../../user/models/user.model');
const UserSession = require('../../setting/models/userSession.model');
const AppError = require('../../../common/exceptions/AppError');

const normalizeRoleName = (value) => {
    if (!value) return '';

    return String(value)
        .trim()
        .toUpperCase()
        .replace(/\s+/g, '_')
        .replace(/-/g, '_');
};

const getJwtVerifyOptions = () => {
    const options = {};

    if (process.env.JWT_ISSUER) {
        options.issuer = process.env.JWT_ISSUER;
    }

    return options;
};

const getJwtSignOptions = (expiresIn) => {
    const options = {
        expiresIn,
    };

    if (process.env.JWT_ISSUER) {
        options.issuer = process.env.JWT_ISSUER;
    }

    return options;
};

const getRoleObject = (user) => {
    if (!user || !user.role_id) return null;

    return typeof user.role_id === 'object'
        ? user.role_id
        : null;
};

const getRoleId = (user) => {
    const roleObject = getRoleObject(user);

    return roleObject?._id || user?.role_id || null;
};

const getRoleName = (user) => {
    const directRole =
        user?.role_name ||
        user?.roleName ||
        user?.system_role ||
        user?.systemRole ||
        user?.role ||
        user?.role_code ||
        user?.roleCode;

    if (directRole) {
        return normalizeRoleName(directRole);
    }

    const roleObject = getRoleObject(user);

    if (roleObject) {
        return normalizeRoleName(roleObject.name || roleObject.code);
    }

    return '';
};

const getSafeUser = (user) => {
    const id = user._id || user.id;
    const roleObject = getRoleObject(user);
    const roleId = getRoleId(user);
    const roleName = getRoleName(user) || 'UNKNOWN_ROLE';

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

        role_id: roleObject
            ? {
                _id: roleObject._id,
                id: roleObject._id,
                name: roleObject.name,
                scope: roleObject.scope,
            }
            : roleId,

        role_name: roleName,
        roleName: roleName,
        role_code: roleName,
        roleCode: roleName,
        system_role: roleName,
        systemRole: roleName,
        system_role_ids: roleName !== 'UNKNOWN_ROLE' ? [roleName] : [],

        status: user.status,
    };
};

const generateTokenPayload = (user) => {
    const id = user._id || user.id;
    const roleId = getRoleId(user);
    const roleName = getRoleName(user) || null;

    return {
        id,
        _id: id,
        user_id: id,

        email: user.email,
        department_id: user.department_id || null,

        role_id: roleId,
        role_name: roleName,
        role_code: roleName,
        system_role: roleName,
    };
};

const signAccessToken = (user) => {
    const payload = generateTokenPayload(user);

    return jwt.sign(
        payload,
        process.env.JWT_SECRET,
        getJwtSignOptions(process.env.JWT_ACCESS_EXPIRES_IN || '15m'),
    );
};

const signRefreshToken = (user) => {
    const id = user._id || user.id;

    return jwt.sign(
        {
            id,
            _id: id,
            user_id: id,
            token_type: 'refresh',
        },
        process.env.JWT_SECRET,
        getJwtSignOptions(process.env.JWT_REFRESH_EXPIRES_IN || '7d'),
    );
};

const hashToken = (token) => {
    return crypto
        .createHash('sha256')
        .update(String(token))
        .digest('hex');
};

const getClientIp = (req) => {
    const forwardedFor = req?.headers?.['x-forwarded-for'];

    if (forwardedFor) {
        return String(forwardedFor).split(',')[0].trim();
    }

    return (
        req?.ip ||
        req?.socket?.remoteAddress ||
        req?.connection?.remoteAddress ||
        '0.0.0.0'
    );
};

const getDeviceType = (userAgent = '') => {
    const ua = String(userAgent).toLowerCase();

    if (!ua) return 'Unknown Device';
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
        return 'Mobile';
    }
    if (ua.includes('ipad') || ua.includes('tablet')) {
        return 'Tablet';
    }
    if (ua.includes('postman') || ua.includes('insomnia')) {
        return 'API Client';
    }

    return 'Desktop';
};

const recordSession = async ({
    userId,
    accessToken,
    req,
}) => {
    if (!userId || !accessToken) return;

    const tokenHash = hashToken(accessToken);
    const userAgent = req?.headers?.['user-agent'] || null;

    await UserSession.findOneAndUpdate(
        {
            token_hash: tokenHash,
        },
        {
            $set: {
                user_id: userId,
                token_hash: tokenHash,
                device_type: getDeviceType(userAgent),
                user_agent: userAgent,
                ip_address: getClientIp(req),
                is_active: true,
                last_activity: new Date(),
            },
        },
        {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
        },
    );
};

const validateActiveUser = (user) => {
    if (!user) {
        throw new AppError('Invalid credentials', 401, 'UNAUTHORIZED');
    }

    if (user.status === 'INACTIVE' || user.status === 'DISABLED' || user.is_deleted) {
        throw new AppError(
            'Tài khoản đã bị khóa hoặc không tồn tại',
            401,
            'UNAUTHORIZED',
        );
    }
};

exports.login = async (email, password, req = null) => {
    if (!email || !password) {
        throw new AppError('Email and password are required', 400, 'BAD_REQUEST');
    }

    const user = await User.findOne({
        email: String(email).trim().toLowerCase(),
    })
        .select('+password_hash +password')
        .populate('role_id', 'name scope')
        .lean();

    validateActiveUser(user);

    const hashToCompare = user.password_hash || user.password;

    if (!hashToCompare) {
        throw new AppError(
            'Account has no password set. Please reset password.',
            401,
            'UNAUTHORIZED',
        );
    }

    const isMatch = await bcrypt.compare(password, hashToCompare);

    if (!isMatch) {
        throw new AppError('Invalid credentials', 401, 'UNAUTHORIZED');
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    await recordSession({
        userId: user._id,
        accessToken,
        req,
    });

    return {
        user: getSafeUser(user),
        accessToken,
        refreshToken,
    };
};

exports.refreshToken = async (token, req = null) => {
    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET,
            getJwtVerifyOptions(),
        );

        if (decoded.token_type && decoded.token_type !== 'refresh') {
            throw new AppError('Invalid refresh token', 401, 'UNAUTHORIZED');
        }

        const userId =
            decoded.id ||
            decoded._id ||
            decoded.user_id;

        if (!userId) {
            throw new AppError('Invalid refresh token', 401, 'UNAUTHORIZED');
        }

        const user = await User.findById(userId)
            .populate('role_id', 'name scope')
            .lean();

        validateActiveUser(user);

        const accessToken = signAccessToken(user);
        const refreshToken = signRefreshToken(user);

        await recordSession({
            userId: user._id,
            accessToken,
            req,
        });

        return {
            user: getSafeUser(user),
            accessToken,
            refreshToken,
        };
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }

        throw new AppError(
            'Phiên đăng nhập hết hạn, vui lòng đăng nhập lại',
            401,
            'UNAUTHORIZED',
        );
    }
};