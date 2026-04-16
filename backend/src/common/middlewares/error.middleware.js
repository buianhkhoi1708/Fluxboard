const AppError = require('../exceptions/AppError');

const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    if (err.code === 11000) {
        const message = 'Duplicate field value entered';
        error = new AppError(message, 400, 'DUPLICATE_ERROR');
    }

    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map(val => val.message).join(', ');
        error = new AppError(message, 400, 'VALIDATION_ERROR');
    }

    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        error: {
            code: error.errorCode || 'INTERNAL_SERVER_ERROR',
            message: error.message || 'Server Error'
        }
    });
};

module.exports = errorHandler;