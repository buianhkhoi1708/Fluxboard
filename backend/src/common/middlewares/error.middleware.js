const AppError = require('../exceptions/AppError');

const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let errorCode = err.errorCode || 'INTERNAL_SERVER_ERROR';
    let message = err.message || 'Something went wrong';
    let fieldErrors = null;

    if (err.name === 'CastError') {
        statusCode = 400;
        errorCode = 'INVALID_FORMAT';
        message = `Invalid format for field: ${err.path}`;
    }

    if (err.name === 'ValidationError') {
        statusCode = 400;
        errorCode = 'VALIDATION_FAILED';
        message = 'Input data validation failed';
        fieldErrors = Object.values(err.errors).map(val => ({
            field: val.path,
            message: val.message
        }));
    }

    if (err.code === 11000) {
        statusCode = 409;
        errorCode = 'DUPLICATE_RESOURCE';
        const field = Object.keys(err.keyValue)[0];
        message = `The ${field} already exists`;
    }

    if (statusCode === 500) {
        console.error('💥 [SERVER ERROR]:', err);
    }

    res.status(statusCode).json({
        success: false,
        error: {
            code: errorCode,
            message: message,
            details: fieldErrors,
            timestamp: new Date().toISOString()
        }
    });
};

module.exports = errorHandler;