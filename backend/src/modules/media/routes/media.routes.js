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
  "application/pdf", // PDF
  "application/msword", // DOC
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // DOCX
  "application/vnd.ms-excel", // XLS
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // XLSX
  "application/zip", // ZIP
  "application/x-zip-compressed" // ZIP (Windows)
];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error("Only JPG, PNG, WEBP are allowed"), false);
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

      /**
       * Upload avatar
       */

      const fileUrl = await s3Service.uploadAvatar(req.file);

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
