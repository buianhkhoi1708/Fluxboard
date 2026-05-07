const taskService = require('../services/task.service');
const s3Service = require('../../media/services/s3.service');

exports.createTask = async (req, res, next) => {
    try {
        const task = await taskService.createTask(req.body);

        await taskService.logActivity(task._id, req.user.id, 'CREATED', 'created this task');
        
        res.status(201).json({ success: true, data: task, message: 'Task created successfully' });
    } catch (error) { next(error); }
};

exports.updateTask = async (req, res, next) => {
    try {
        const task = await taskService.updateTask(req.params.id, req.body);

        await taskService.logActivity(req.params.id, req.user.id, 'UPDATED', 'updated task details');
        
        res.status(200).json({ success: true, data: task, message: 'Task updated successfully' });
    } catch (error) { next(error); }
};

exports.deleteTask = async (req, res, next) => {
    try {
        await taskService.deleteTask(req.params.id);
        res.status(200).json({ success: true, message: 'Task deleted successfully' });
    } catch (error) { next(error); }
};

exports.moveTask = async (req, res, next) => {
    try {
        const { destColumnId, newOrder } = req.body;
        await taskService.moveTask(req.params.id, destColumnId, newOrder);
        
        await taskService.logActivity(req.params.id, req.user.id, 'MOVED', 'moved this task to a new position');

        res.status(200).json({ success: true, message: 'Task moved successfully' });
    } catch (error) { next(error); }
};

// ==========================================
// QUẢN LÝ CHECKLIST (SUBTASKS)
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
// QUẢN LÝ BÌNH LUẬN (COMMENTS)
// ==========================================

exports.addComment = async (req, res, next) => {
    try {
        const comment = await taskService.addComment(req.params.id, req.user.id, req.body.content);
        res.status(201).json({ success: true, data: comment, message: 'Comment added' });
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
        res.status(200).json({ success: true, message: 'Comment deleted' });
    } catch (error) { next(error); }
};

// ==========================================
// ĐỢT 3: LỊCH SỬ HOẠT ĐỘNG (ACTIVITY LOGS)
// ==========================================

exports.getTaskActivities = async (req, res, next) => {
    try {
        const activities = await taskService.getTaskActivities(req.params.id);
        res.status(200).json({ success: true, data: activities });
    } catch (error) { next(error); }
};

// ==========================================
// ĐỢT 3: ĐÍNH KÈM FILE (AWS S3)
// ==========================================

exports.uploadAttachment = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file provided' });
        }
        
        // 1. Dùng S3 Service của bạn để đẩy file từ RAM lên AWS S3
        const fileUrl = await s3Service.uploadFile(req.file);

        // 2. Lấy URL trả về và lưu vào MongoDB
        const fileData = {
            file_name: req.file.originalname,
            file_url: fileUrl,
            mime_type: req.file.mimetype
        };
        const attachment = await taskService.addAttachment(req.params.id, req.user.id, fileData);
        
        res.status(201).json({ success: true, data: attachment, message: 'File uploaded to S3 successfully' });
    } catch (error) { next(error); }
};

exports.getTaskAttachments = async (req, res, next) => {
    try {
        const attachments = await taskService.getTaskAttachments(req.params.id);
        res.status(200).json({ success: true, data: attachments });
    } catch (error) { next(error); }
};