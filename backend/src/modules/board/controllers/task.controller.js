const taskService = require('../services/task.service');
const s3Service = require('../../media/services/s3.service');
const activityService = require('../../activity/services/activity.service');
const notificationService = require('../../notification/services/notification.service');

exports.createTask = async (req, res, next) => {
    try {
        const task = await taskService.createTask(req.body);

        await activityService.logActivity({
            action: 'CREATE',
            source: 'USER',
            actor_id: req.user.id,
            target_id: task._id,
            target_type: 'Task',
            project_id: task.project_id || null,
            details: { message: 'Created a new task', title: task.title }
        });
        
        res.status(201).json({ success: true, data: task, message: 'Task created successfully' });
    } catch (error) { next(error); }
};

exports.updateTask = async (req, res, next) => {
    try {
        const task = await taskService.updateTask(req.params.id, req.body);

        if (req.body.assignee_id) {
            await notificationService.queueNotification({
                recipient_id: req.body.assignee_id,
                sender_id: req.user.id,
                title: 'New task assigned',
                message: `You have been assigned to task: ${task.title}`,
                type: 'ASSIGN_TASK',
                reference_id: task._id
            });
        }

        await activityService.logActivity({
            action: 'UPDATE',
            source: 'USER',
            actor_id: req.user.id,
            target_id: task._id,
            target_type: 'Task',
            project_id: task.project_id || null,
            details: { message: 'Updated task details' }
        });
        
        res.status(200).json({ success: true, data: task, message: 'Task updated successfully' });
    } catch (error) { 
        next(error); 
    }
};

exports.deleteTask = async (req, res, next) => {
    try {
        await taskService.deleteTask(req.params.id);
        
        await activityService.logActivity({
            action: 'DELETE',
            source: 'USER',
            actor_id: req.user.id,
            target_id: req.params.id,
            target_type: 'Task',
            details: { message: 'Deleted a task' }
        });

        res.status(200).json({ success: true, message: 'Task deleted successfully' });
    } catch (error) { next(error); }
};

exports.moveTask = async (req, res, next) => {
    try {
        const { destColumnId, newOrder } = req.body;
        const task = await taskService.moveTask(req.params.id, destColumnId, newOrder);
        
        await activityService.logActivity({
            action: 'MOVE',
            source: 'USER',
            actor_id: req.user.id,
            target_id: task._id,
            target_type: 'Task',
            project_id: task.project_id || null,
            details: { message: 'Moved a task' }
        });

        res.status(200).json({ success: true, message: 'Task moved successfully' });
    } catch (error) { next(error); }
};

// ==========================================
// SUBTASKS
// ==========================================

exports.addSubtask = async (req, res, next) => {
    try {
        const { title } = req.body;
        const task = await taskService.addSubtask(req.params.id, title);
        res.status(201).json({ success: true, data: task, message: 'Subtask added successfully' });
    } catch (error) { next(error); }
};

exports.updateSubtask = async (req, res, next) => {
    try {
        const task = await taskService.updateSubtask(req.params.id, req.params.subtaskId, req.body);
        res.status(200).json({ success: true, data: task, message: 'Subtask updated successfully' });
    } catch (error) { next(error); }
};

exports.deleteSubtask = async (req, res, next) => {
    try {
        const task = await taskService.deleteSubtask(req.params.id, req.params.subtaskId);
        res.status(200).json({ success: true, data: task, message: 'Subtask deleted successfully' });
    } catch (error) { next(error); }
};

// ==========================================
// COMMENTS
// ==========================================

exports.addComment = async (req, res, next) => {
    try {
        const comment = await taskService.addComment(req.params.id, req.user.id, req.body.content);
        res.status(201).json({ success: true, data: comment, message: 'Comment added successfully' });
    } catch (error) { next(error); }
};

exports.getTaskComments = async (req, res, next) => {
    try {
        const comments = await taskService.getTaskComments(req.params.id);
        res.status(200).json({ success: true, data: comments });
    } catch (error) { next(error); }
};

exports.deleteComment = async (req, res, next) => {
    try {
        await taskService.deleteComment(req.params.commentId, req.user.id);
        res.status(200).json({ success: true, message: 'Comment deleted successfully' });
    } catch (error) { next(error); }
};

// ==========================================
// ATTACHMENTS (AWS S3)
// ==========================================

exports.uploadAttachment = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file provided' });
        }
        
        const fileUrl = await s3Service.uploadFile(req.file);

        const fileData = {
            file_name: req.file.originalname,
            file_url: fileUrl,
            mime_type: req.file.mimetype
        };
        const attachment = await taskService.addAttachment(req.params.id, req.user.id, fileData);
        
        await activityService.logActivity({
            action: 'UPDATE', 
            source: 'USER',
            actor_id: req.user.id,
            target_id: req.params.id,
            target_type: 'Task',
            details: { message: `Uploaded file: ${req.file.originalname}` }
        });

        res.status(201).json({ success: true, data: attachment, message: 'File uploaded to S3 successfully' });
    } catch (error) { next(error); }
};

exports.getTaskAttachments = async (req, res, next) => {
    try {
        const attachments = await taskService.getTaskAttachments(req.params.id);
        res.status(200).json({ success: true, data: attachments });
    } catch (error) { next(error); }
};

// ==========================================
// ACTIVITY LOGS
// ==========================================

exports.getTaskActivities = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        
        const activities = await activityService.getTaskActivities(req.params.id, page, limit);
        res.status(200).json({ success: true, data: activities });
    } catch (error) { next(error); }
};