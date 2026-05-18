const AppError = require('../exceptions/AppError');

const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let errorCode = err.errorCode || 'INTERNAL_SERVER_ERROR';
    let message = err.message || 'Something went wrong';
    let fieldErrors = null;

    // ==========================================
    // 1. CÁC LỖI TỪ DATABASE (MONGODB / MONGOOSE)
    // ==========================================
    
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

    // ==========================================
    // 2. CÁC LỖI BỔ SUNG (BẢO VỆ SERVER TOÀN DIỆN)
    // ==========================================

    // Lỗi Token không hợp lệ (Bị sửa đổi, fake token...)
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        errorCode = 'INVALID_TOKEN';
        message = 'Invalid authentication token. Please log in again!';
    }

    // Lỗi Token đã hết hạn
    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        errorCode = 'TOKEN_EXPIRED';
        message = 'Your token has expired. Please log in again!';
    }

    // Lỗi Upload file (Ví dụ: File vượt quá 5MB mà ta đã cấu hình ở Multer)
    if (err.name === 'MulterError') {
        statusCode = 400;
        errorCode = 'FILE_UPLOAD_ERROR';
        message = err.message;
    }

    // Lỗi Frontend gửi sai cú pháp JSON (VD: thiếu dấu ngoặc)
    if (err.type === 'entity.parse.failed' || err.name === 'SyntaxError') {
        statusCode = 400;
        errorCode = 'BAD_JSON_FORMAT';
        message = 'Invalid JSON format in the request body';
    }

    // ==========================================
    // 3. XỬ LÝ LOG & TRẢ VỀ RESPONSE
    // ==========================================
    if (statusCode === 500) {
        console.error('💥 [SERVER ERROR]:', err);
    }

    res.status(statusCode).json({
        success: false,
        error: {
            code: errorCode,
            message: message,
            ...(fieldErrors && { details: fieldErrors })
        }
    });
};

module.exports = errorHandler;