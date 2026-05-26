const express = require("express");
const router = express.Router();
const multer = require("multer");
const s3Service = require("../services/s3.service");
const requireAuth = require("../../auth/middlewares/requireAuth");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // Giới hạn 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "image/jpeg", 
      "image/png", 
      "image/webp",
      "application/pdf", 
      "application/msword", 
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 
      "application/vnd.ms-excel", 
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 
      "application/zip", 
      "application/x-zip-compressed" 
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      // 🚀 ĐÃ SỬA THÔNG BÁO LỖI CHO ĐÚNG THỰC TẾ
      return cb(new Error("Định dạng file không hỗ trợ. Chỉ cho phép ảnh, PDF, Word, Excel và ZIP."), false);
    }

    cb(null, true);
  },
});

router.post(
  "/upload",
  requireAuth,
  upload.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file provided",
        });
      }

      // 🚀 ĐÃ FIX CÚ LỪA AVATAR
      // Sếp nhớ vào file s3.service.js viết thêm hàm `uploadFile` (hoặc uploadAttachment) 
      // để nó lưu vào đúng thư mục 'attachments/' thay vì 'avatars/' nhé!
      const fileUrl = await s3Service.uploadFile(req.file); 

      return res.status(200).json({
        success: true,
        data: {
          url: fileUrl,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;