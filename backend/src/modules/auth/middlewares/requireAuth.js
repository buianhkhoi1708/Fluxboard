const jwt = require('jsonwebtoken');
const AppError = require('../../../common/exceptions/AppError');

const getJwtVerifyOptions = () => {
    const options = {};

    if (process.env.JWT_ISSUER) {
        options.issuer = process.env.JWT_ISSUER;
    }

    return options;
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
            getJwtVerifyOptions()
        );

        const userId =
            decoded.id ||
            decoded._id ||
            decoded.user_id;

        req.user = {
            ...decoded,
            id: userId,
            _id: userId,
            user_id: userId
        };

        next();
    } catch (err) {
        return next(new AppError('Token expired or invalid', 401, 'UNAUTHORIZED'));
    }
};