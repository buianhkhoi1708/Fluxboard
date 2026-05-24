const activityService = require('../services/activity.service');

exports.getProjectActivities = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        
        const activities = await activityService.getProjectActivities(projectId, page, limit);
        res.status(200).json({ success: true, data: activities });
    } catch (error) { next(error); }
};

// controllers/activity.controller.js

exports.getAllActivities = async (req, res, next) => {
    try {
        const { page = 0, size = 20, source_type, action, from, to } = req.query;

        // Gọi service lấy toàn bộ hệ thống (không truyền projectId)
        const result = await activityService.getActivities({
            page: parseInt(page),
            size: parseInt(size),
            sourceType: source_type,
            action,
            from,
            to
        });

        res.status(200).json({
            success: true,
            code: "SUCCESS",
            message: "Lấy nhật ký hệ thống thành công",
            data: result.activities,
            meta: {
                page: result.page,
                size: result.size,
                total_elements: result.totalElements,
                total_pages: result.totalPages,
                has_next: result.hasNext,
                has_previous: result.hasPrevious
            }
        });
    } catch (error) {
        next(error);
    }
};
