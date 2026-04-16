const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100
});

exports.sendEmail = async (to, subject, htmlContent) => {
    try {
        const mailOptions = {
            from: `"FluxBoard System" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html: htmlContent
        };
        const info = await transporter.sendMail(mailOptions);
        return info;
    } catch (error) {
        console.error('SMTP Email Error:', error);
        throw { statusCode: 500, message: 'Failed to send email' };
    }
};