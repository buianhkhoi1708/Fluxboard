const express = require('express');
const router = express.Router();
const multer = require('multer');
const s3Service = require('../services/s3.service');
const requireAuth = require('../../auth/middlewares/requireAuth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }); // Limit 5MB

router.post('/upload', requireAuth, upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file) throw { statusCode: 400, message: 'No file provided' };
        const fileUrl = await s3Service.uploadFile(req.file);
        res.status(200).json({ success: true, data: { url: fileUrl } });
    } catch (error) { next(error); }
});

module.exports = router;