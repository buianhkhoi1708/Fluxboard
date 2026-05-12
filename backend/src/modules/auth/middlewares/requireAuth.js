const jwt = require('jsonwebtoken');
const AppError = require('../../../common/exceptions/AppError');

module.exports = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new AppError('Missing token', 401, 'UNAUTHORIZED'));
    }

    const token = authHeader.split(' ')[1];
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (err) {
        return next(new AppError('Invalid token', 401, 'UNAUTHORIZED'));
    }
};