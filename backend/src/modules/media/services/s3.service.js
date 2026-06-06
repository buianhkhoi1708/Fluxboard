const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");

const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const { v4: uuidv4 } = require("uuid");

const path = require("path");

const crypto = require("crypto");

const s3Client = new S3Client({
  region: process.env.AWS_REGION,

  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});

/**
 * =========================================================
 * Upload trực tiếp từ Backend → S3
 * Dùng cho:
 * - Avatar
 * - File nhỏ
 * =========================================================
 */

exports.uploadAvatar = async (file) => {
  const extension = path.extname(file.originalname);

  const fileName = `avatar-${uuidv4()}${extension}`;

  const s3Key = `fluxboard/avatars/${fileName}`;

  const params = {
    Bucket: process.env.AWS_S3_BUCKET,

    Key: s3Key,

    Body: file.buffer,

    ContentType: file.mimetype,

    CacheControl: "max-age=31536000",

    ContentDisposition: "inline",
  };

  await s3Client.send(new PutObjectCommand(params));

  return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
};

/**
 * =========================================================
 * Upload chung
 * =========================================================
 */

exports.uploadFile = async (file) => {
  const fileExtension = path.extname(file.originalname);

  const fileName = `${uuidv4()}${fileExtension}`;

  const s3Key = `fluxboard/uploads/${fileName}`;

  const params = {
    Bucket: process.env.AWS_S3_BUCKET,

    Key: s3Key,

    Body: file.buffer,

    ContentType: file.mimetype,

    CacheControl: "max-age=31536000",

    ContentDisposition: "inline",
  };

  await s3Client.send(new PutObjectCommand(params));

  return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
};

/**
 * =========================================================
 * Generate Presigned URL
 * Dùng cho:
 * - Task attachment
 * - Large upload
 * - Enterprise flow
 * =========================================================
 */

exports.generateUploadUrl = async (fileName, fileType) => {
  const extension = path.extname(fileName);

  const uniqueFileName = `${crypto.randomBytes(16).toString("hex")}${extension}`;

  const s3Key = `fluxboard/task-attachments/${uniqueFileName}`;

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,

    Key: s3Key,

    ContentType: fileType,

    CacheControl: "max-age=31536000",

    ContentDisposition: "inline",
  });

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 3600,
  });

  const fileUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;

  return {
    uploadUrl,
    fileUrl,
  };
};

/**
 * =========================================================
 * Generate Avatar Presigned URL
 * =========================================================
 */

exports.generateAvatarUploadUrl = async (fileName, fileType) => {
  const extension = path.extname(fileName);

  const uniqueFileName = `avatar-${uuidv4()}${extension}`;

  const s3Key = `fluxboard/avatars/${uniqueFileName}`;

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,

    Key: s3Key,

    ContentType: fileType,

    CacheControl: "max-age=31536000",

    ContentDisposition: "inline",
  });

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 300,
  });

  const fileUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;

  return {
    uploadUrl,
    fileUrl,
  };
};

/**
 * =========================================================
 * Delete File
 * =========================================================
 */

exports.deleteFile = async (fileUrl) => {
  if (!fileUrl) return;

  try {
    const bucketDomain = `${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/`;

    let s3Key = fileUrl.replace(`https://${bucketDomain}`, "");

    /**
     * Fallback regionless URL
     */

    if (s3Key === fileUrl) {
      s3Key = fileUrl.replace(
        `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/`,
        "",
      );
    }

    const command = new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,

      Key: s3Key,
    });

    await s3Client.send(command);
  } catch (error) {
    console.error("Failed to delete S3 object:", error);
  }
};
