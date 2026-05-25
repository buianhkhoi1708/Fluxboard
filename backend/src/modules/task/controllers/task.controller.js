const taskCoreService = require('../services/taskCore.service');
const subtaskService = require('../services/subtask.service');
const taskCommentService = require('../services/taskComment.service');
const taskAttachmentService = require('../services/taskAttachment.service');
const s3Service = require('../../media/services/s3.service');
const activityService = require('../../activity/services/activity.service');

const getAuthUserId = (req) => {
    return req.user?.id || req.user?._id;
};

const readRawBodyIfNeeded = async (req) => {
    let taskData = req.body;

    if (taskData && typeof taskData === 'object' && Object.keys(taskData).length > 0) {
        return taskData;
    }

    return await new Promise((resolve) => {
        const chunks = [];

        req.on('data', (chunk) => chunks.push(chunk));

        req.on('end', () => {
            try {
                const rawBody = Buffer.concat(chunks).toString();
                resolve(rawBody ? JSON.parse(rawBody) : null);
            } catch (error) {
                console.error('Lỗi parse dữ liệu thô:', error);
                resolve(null);
            }
        });
    });
};

// ==========================================
// 1. QUẢN LÝ THẺ CÔNG VIỆC (TASK CORE)
// ==========================================
exports.createTask = async (req, res, next) => {
    try {
        const actorId = getAuthUserId(req);
        const taskData = await readRawBodyIfNeeded(req);

        if (!taskData || Object.keys(taskData).length === 0) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_REQUEST',
                    message: 'Không nhận được dữ liệu. Vui lòng kiểm tra lại phía Frontend.'
                }
            });
        }

        const payload = {
            ...taskData,
            board_id: taskData.board_id || taskData.boardId,
            column_id: taskData.column_id || taskData.columnId,
            author_user_id: taskData.author_user_id || actorId
        };

        if (!payload.board_id) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_FAILED',
                    message: 'Thiếu trường bắt buộc: board_id'
                }
            });
        }

        if (!payload.column_id) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_FAILED',
                    message: 'Thiếu trường bắt buộc: column_id'
                }
            });
        }

        const task = await taskCoreService.createTask(payload, actorId);

        if (task && actorId) {
            await activityService.logActivity({
                action: 'CREATE',
                source: 'USER',
                actor_id: actorId,
                target_id: task._id,
                target_type: 'Task',
                project_id: task.project_id || payload.project_id || null,
                details: {
                    message: 'Created a new task',
                    title: task.title
                }
            });
        }

        res.status(201).json({
            success: true,
            data: task,
            message: 'Task created successfully'
        });
    } catch (error) {
        console.error('Lỗi chi tiết tại taskController.createTask:', error);
        next(error);
    }
};

exports.updateTask = async (req, res, next) => {
    try {
        const actorId = getAuthUserId(req);
        const task = await taskCoreService.updateTask(req.params.id, req.body, actorId);

        await activityService.logActivity({
            action: 'UPDATE',
            source: 'USER',
            actor_id: actorId,
            target_id: task._id,
            target_type: 'Task',
            project_id: task.project_id || null,
            details: {
                message: 'Updated task details'
            }
        });

        res.status(200).json({
            success: true,
            data: task,
            message: 'Task updated successfully'
        });
    } catch (error) {
        next(error);
    }
};

exports.deleteTask = async (req, res, next) => {
    try {
        const actorId = getAuthUserId(req);

        await taskCoreService.deleteTask(req.params.id, actorId);

        await activityService.logActivity({
            action: 'DELETE',
            source: 'USER',
            actor_id: actorId,
            target_id: req.params.id,
            target_type: 'Task',
            details: {
                message: 'Deleted a task'
            }
        });

        res.status(200).json({
            success: true,
            message: 'Task deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

exports.moveTask = async (req, res, next) => {
    try {
        const actorId = getAuthUserId(req);
        const { destColumnId, newOrder } = req.body;

        const task = await taskCoreService.moveTask(
            req.params.id,
            destColumnId,
            newOrder,
            actorId
        );

        await activityService.logActivity({
            action: 'MOVE',
            source: 'USER',
            actor_id: actorId,
            target_id: task._id,
            target_type: 'Task',
            project_id: task.project_id || null,
            details: {
                message: 'Moved task to another column'
            }
        });

        res.status(200).json({
            success: true,
            message: 'Task moved successfully',
            data: task
        });
    } catch (error) {
        next(error);
    }
};

exports.getMyTasks = async (req, res, next) => {
    try {
        const tasks = await taskCoreService.getMyTasks(getAuthUserId(req));

        res.status(200).json({
            success: true,
            data: tasks
        });
    } catch (error) {
        next(error);
    }
};

// ==========================================
// 2. QUẢN LÝ CHECKLIST (SUBTASKS)
// ==========================================
exports.addSubtask = async (req, res, next) => {
    try {
        const task = await subtaskService.addSubtask(req.params.id, req.body.title);

        res.status(201).json({
            success: true,
            data: task
        });
    } catch (error) {
        next(error);
    }
};

exports.addMultipleSubtasks = async (req, res, next) => {
    try {
        const task = await subtaskService.addMultipleSubtasks(req.params.id, req.body.titles);

        res.status(201).json({
            success: true,
            data: task,
            message: 'Multiple subtasks added successfully'
        });
    } catch (error) {
        next(error);
    }
};

exports.updateSubtask = async (req, res, next) => {
    try {
        const task = await subtaskService.updateSubtask(
            req.params.id,
            req.params.subtaskId,
            req.body
        );

        res.status(200).json({
            success: true,
            data: task
        });
    } catch (error) {
        next(error);
    }
};

exports.deleteSubtask = async (req, res, next) => {
    try {
        const task = await subtaskService.deleteSubtask(req.params.id, req.params.subtaskId);

        res.status(200).json({
            success: true,
            data: task
        });
    } catch (error) {
        next(error);
    }
};

// ==========================================
// 3. QUẢN LÝ BÌNH LUẬN (COMMENTS)
// ==========================================
exports.addComment = async (req, res, next) => {
    try {
        const comment = await taskCommentService.addComment(
            req.params.id,
            getAuthUserId(req),
            req.body.content
        );

        res.status(201).json({
            success: true,
            data: comment
        });
    } catch (error) {
        next(error);
    }
};

exports.getTaskComments = async (req, res, next) => {
    try {
        const comments = await taskCommentService.getTaskComments(req.params.id);

        res.status(200).json({
            success: true,
            data: comments
        });
    } catch (error) {
        next(error);
    }
};

exports.updateComment = async (req, res, next) => {
    try {
        const comment = await taskCommentService.updateComment(
            req.params.commentId,
            getAuthUserId(req),
            req.body.content
        );

        res.status(200).json({
            success: true,
            data: comment,
            message: 'Comment updated'
        });
    } catch (error) {
        next(error);
    }
};

exports.deleteComment = async (req, res, next) => {
    try {
        await taskCommentService.deleteComment(req.params.commentId, getAuthUserId(req));

        res.status(200).json({
            success: true,
            message: 'Comment deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

// ==========================================
// 4. ĐÍNH KÈM FILE (ATTACHMENTS VIA AWS S3 - PRESIGNED URL)
// ==========================================
exports.getAttachmentUploadUrl = async (req, res, next) => {
    try {
        const { fileName, fileType } = req.body;

        if (!fileName || !fileType) {
            return res.status(400).json({
                success: false,
                message: 'Missing fileName or fileType'
            });
        }

        const data = await s3Service.generateUploadUrl(fileName, fileType);

        res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
};

exports.saveAttachmentMetadata = async (req, res, next) => {
    try {
        const { fileName, fileUrl, mimeType } = req.body;

        if (!fileName || !fileUrl) {
            return res.status(400).json({
                success: false,
                message: 'Missing file metadata'
            });
        }

        const fileData = {
            file_name: fileName,
            file_url: fileUrl,
            mime_type: mimeType
        };

        const attachment = await taskAttachmentService.addAttachment(
            req.params.id,
            getAuthUserId(req),
            fileData
        );

        await activityService.logActivity({
            action: 'UPDATE',
            source: 'USER',
            actor_id: getAuthUserId(req),
            target_id: req.params.id,
            target_type: 'Task',
            details: {
                message: `Attached file: ${fileName}`
            }
        });

        res.status(201).json({
            success: true,
            data: attachment,
            message: 'Attachment metadata saved successfully'
        });
    } catch (error) {
        next(error);
    }
};

exports.getTaskAttachments = async (req, res, next) => {
    try {
        const attachments = await taskAttachmentService.getTaskAttachments(req.params.id);

        res.status(200).json({
            success: true,
            data: attachments
        });
    } catch (error) {
        next(error);
    }
};

exports.deleteAttachment = async (req, res, next) => {
    try {
        await taskAttachmentService.deleteAttachment(
            req.params.attachmentId,
            getAuthUserId(req)
        );

        res.status(200).json({
            success: true,
            message: 'Attachment deleted'
        });
    } catch (error) {
        next(error);
    }
};

// ==========================================
// 5. NHẬT KÝ HOẠT ĐỘNG (ACTIVITY LOGS)
// ==========================================
exports.getTaskActivities = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 20;

        const activities = await activityService.getActivitiesByTarget(
            'Task',
            req.params.id,
            page,
            limit
        );

        res.status(200).json({
            success: true,
            data: activities
        });
    } catch (error) {
        next(error);
    }
};