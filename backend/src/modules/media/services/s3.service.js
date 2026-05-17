const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const crypto = require('crypto');

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_KEY
    }
});

// Hàm cũ: Upload file trực tiếp (Dành cho Avatar hoặc các file nhỏ xử lý tại Backend)
exports.uploadFile = async (file) => {
    const fileExtension = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExtension}`;
    
    const params = {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: `fluxboard/uploads/${fileName}`,
        Body: file.buffer,
        ContentType: file.mimetype,
    };

    await s3Client.send(new PutObjectCommand(params));
    
    return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/fluxboard/uploads/${fileName}`;
};

// 💡 Hàm mới: Tạo Presigned URL cho Frontend tự upload trực tiếp lên S3 (Tránh sập Backend)
exports.generateUploadUrl = async (fileName, fileType) => {
    // Tạo tên file duy nhất tránh trùng lặp
    const uniqueFileName = `${crypto.randomBytes(16).toString('hex')}-${fileName}`;
    const s3Key = `fluxboard/task-attachments/${uniqueFileName}`;
    
    const command = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: s3Key,
        ContentType: fileType
    });

    // Tạo URL presigned có hiệu lực trong 1 giờ (3600 giây)
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    const fileUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;

    return { uploadUrl, fileUrl };
};