const express = require("express");
const router = express.Router();
const multer = require("multer");
const s3Service = require("../services/s3.service");
const requireAuth = require("../../auth/middlewares/requireAuth");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
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
      "application/x-zip-compressed",
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(
        new Error(
          "Định dạng file không hỗ trợ. Chỉ cho phép ảnh, PDF, Word, Excel và ZIP.",
        ),
        false,
      );
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
  },
);

module.exports = router;
