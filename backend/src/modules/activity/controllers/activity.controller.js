const activityService = require('../services/activity.service');

const normalizePage = (page) => {
    const parsed = Number.parseInt(page, 10);

    if (Number.isNaN(parsed) || parsed < 0) {
        return 0;
    }

    return parsed;
};

const normalizeSize = (size, fallback = 20) => {
    const parsed = Number.parseInt(size, 10);

    if (Number.isNaN(parsed) || parsed <= 0) {
        return fallback;
    }

    return Math.min(parsed, 200);
};

exports.getProjectActivities = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const page = normalizePage(req.query.page || 0);
        const limit = normalizeSize(req.query.limit || req.query.size, 20);

        const result = await activityService.getActivities({
            projectId,
            page,
            size: limit,
            sourceType: req.query.source_type,
            action: req.query.action,
            from: req.query.from,
            to: req.query.to,
        });

        res.status(200).json({
            success: true,
            code: 'SUCCESS',
            message: 'Lấy nhật ký dự án thành công',
            data: result.activities,
            meta: {
                page: result.page,
                size: result.size,
                total_elements: result.totalElements,
                total_pages: result.totalPages,
                has_next: result.hasNext,
                has_previous: result.hasPrevious,
            },
        });
    } catch (error) {
        next(error);
    }
};

exports.getAllActivities = async (req, res, next) => {
    try {
        const {
            page = 0,
            size = 20,
            source_type,
            action,
            from,
            to,
        } = req.query;

        const result = await activityService.getActivities({
            page: normalizePage(page),
            size: normalizeSize(size, 20),
            sourceType: source_type,
            action,
            from,
            to,
        });

        res.status(200).json({
            success: true,
            code: 'SUCCESS',
            message: 'Lấy nhật ký hệ thống thành công',
            data: result.activities,
            meta: {
                page: result.page,
                size: result.size,
                total_elements: result.totalElements,
                total_pages: result.totalPages,
                has_next: result.hasNext,
                has_previous: result.hasPrevious,
            },
        });
    } catch (error) {
        next(error);
    }
};

exports.getSecurityActivities = async (req, res, next) => {
    try {
        const {
            page = 0,
            size = 100,
            from,
            to,
        } = req.query;

        const result = await activityService.getSecurityActivities({
            page: normalizePage(page),
            size: normalizeSize(size, 100),
            from,
            to,
        });

        res.status(200).json({
            success: true,
            code: 'SUCCESS',
            message: 'Lấy nhật ký bảo mật hệ thống thành công',
            data: result.activities,
            meta: {
                page: result.page,
                size: result.size,
                total_elements: result.totalElements,
                total_pages: result.totalPages,
                has_next: result.hasNext,
                has_previous: result.hasPrevious,
            },
        });
    } catch (error) {
        next(error);
    }
};