class ResponseFactory {
    // 1. Dùng cho các API thành công
    static success(res, data = null, message = 'Success', statusCode = 200) {
        return res.status(statusCode).json({
            success: true,
            message: message,
            data: data
        });
    }

    // 2. Dùng cho các API lỗi (Sẽ ráp vào errorHandler của sếp)
    static error(res, message = 'Something went wrong', errorCode = 'INTERNAL_SERVER_ERROR', statusCode = 500, details = null) {
        const response = {
            success: false,
            error: {
                code: errorCode,
                message: message,
            }
        };
        
        // Chỉ nhét thêm mảng details vào nếu có (VD: lỗi validate từng field)
        if (details) {
            response.error.details = details;
        }

        return res.status(statusCode).json(response);
    }
}

module.exports = ResponseFactory;