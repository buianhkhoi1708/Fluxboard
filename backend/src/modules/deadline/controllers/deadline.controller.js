const deadlineService = require('../services/deadline.service');
const TaskDeadline = require('../models/taskDeadline.model');

const getAuthUserId = (req) => {
    return req.user?.id || req.user?._id;
};

// Lấy thông tin Deadline của 1 Task
exports.getDeadlineByTask = async (req, res, next) => {
    try {
        const deadline = await TaskDeadline.findOne({
            task_id: req.params.taskId,
            is_deleted: { $ne: true }
        })
            .populate('extension_requested_by', 'full_name email avatar_url')
            .populate('extension_reviewed_by', 'full_name email avatar_url')
            .lean();

        if (!deadline) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy dữ liệu Deadline cho Task này'
            });
        }

        res.status(200).json({
            success: true,
            data: deadline
        });
    } catch (error) {
        next(error);
    }
};

// Nhân viên xin dời hạn
exports.requestExtension = async (req, res, next) => {
    try {
        const userId = getAuthUserId(req);

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized'
            });
        }

        const { new_due_date, reason } = req.body;

        const deadline = await deadlineService.requestExtension(
            req.params.taskId,
            userId,
            new_due_date,
            reason
        );

        res.status(200).json({
            success: true,
            data: deadline,
            message: 'Đã gửi yêu cầu xin dời hạn thành công!'
        });
    } catch (error) {
        next(error);
    }
};

// Quản lý duyệt dời hạn
exports.approveExtension = async (req, res, next) => {
    try {
        const managerId = getAuthUserId(req);

        if (!managerId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized'
            });
        }

        const deadline = await deadlineService.approveExtension(
            req.params.taskId,
            managerId
        );

        res.status(200).json({
            success: true,
            data: deadline,
            message: 'Đã phê duyệt dời hạn!'
        });
    } catch (error) {
        next(error);
    }
};

// Quản lý từ chối dời hạn
exports.rejectExtension = async (req, res, next) => {
    try {
        const managerId = getAuthUserId(req);

        if (!managerId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized'
            });
        }

        const { reject_reason } = req.body;

        const deadline = await deadlineService.rejectExtension(
            req.params.taskId,
            managerId,
            reject_reason
        );

        res.status(200).json({
            success: true,
            data: deadline,
            message: 'Đã từ chối yêu cầu dời hạn!'
        });
    } catch (error) {
        next(error);
    }
};