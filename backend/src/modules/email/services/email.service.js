const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100
});

/**
 * Hàm gửi email chung cho hệ thống
 * @param {string} to - Địa chỉ email người nhận
 * @param {string} subject - Tiêu đề email
 * @param {string} htmlContent - Nội dung email định dạng HTML
 */
exports.sendEmail = async (to, subject, htmlContent) => {
    try {
        const mailOptions = {
            from: `"Hệ thống FluxBoard" <${process.env.EMAIL}>`,
            to,
            subject,
            html: htmlContent
        };

        const info = await transporter.sendMail(mailOptions);
        return info;
    } catch (error) {
        console.error('Lỗi SMTP khi gửi email:', error);

        throw {
            statusCode: 500,
            message: 'Không thể gửi email. Vui lòng thử lại sau.',
            details: error.message
        };
    }
};