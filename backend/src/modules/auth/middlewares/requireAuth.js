const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const AppError = require('../../../common/exceptions/AppError');
const UserSession = require('../../setting/models/userSession.model');

const getJwtVerifyOptions = () => {
    const options = {};

    if (process.env.JWT_ISSUER) {
        options.issuer = process.env.JWT_ISSUER;
    }

    return options;
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

const updateSessionActivity = async ({
    token,
    userId,
    req,
}) => {
    if (!token || !userId) return;

    const tokenHash = hashToken(token);
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

module.exports = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new AppError('Missing token', 401, 'UNAUTHORIZED'));
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET,
            getJwtVerifyOptions(),
        );

        const userId =
            decoded.id ||
            decoded._id ||
            decoded.user_id;

        if (!userId) {
            return next(new AppError('Invalid token payload', 401, 'UNAUTHORIZED'));
        }

        req.user = {
            ...decoded,
            id: userId,
            _id: userId,
            user_id: userId,
            role_name:
                decoded.role_name ||
                decoded.role_code ||
                decoded.system_role ||
                null,
            role_code:
                decoded.role_code ||
                decoded.role_name ||
                decoded.system_role ||
                null,
            system_role:
                decoded.system_role ||
                decoded.role_name ||
                decoded.role_code ||
                null,
        };

        req.accessToken = token;

        updateSessionActivity({
            token,
            userId,
            req,
        }).catch((error) => {
            console.warn('[requireAuth] Failed to update session:', error.message);
        });

        next();
    } catch (err) {
        return next(
            new AppError('Token expired or invalid', 401, 'UNAUTHORIZED'),
        );
    }
};