class ResponseFactory {
  static success(res, data = null, message = "Success", statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message: message,
      data: data,
    });
  }

  static error(
    res,
    message = "Something went wrong",
    errorCode = "INTERNAL_SERVER_ERROR",
    statusCode = 500,
    details = null,
  ) {
    const response = {
      success: false,
      error: {
        code: errorCode,
        message: message,
      },
    };

    if (details) {
      response.error.details = details;
    }

    return res.status(statusCode).json(response);
  }
}

module.exports = ResponseFactory;
