const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_KEY
    }
});

exports.uploadFile = async (file) => {
    const fileExtension = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExtension}`;
    const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `fluxboard/uploads/${fileName}`,
        Body: file.buffer,
        ContentType: file.mimetype,
        // ACL: 'public-read' // Mở khóa nếu bucket cho phép Public ACL
    };

    await s3Client.send(new PutObjectCommand(params));
    return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/fluxboard/uploads/${fileName}`;
};