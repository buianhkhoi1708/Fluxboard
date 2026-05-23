const taskCoreService = require('../services/taskCore.service');
const subtaskService = require('../services/subtask.service');
const taskCommentService = require('../services/taskComment.service');
const taskAttachmentService = require('../services/taskAttachment.service');
const s3Service = require('../../media/services/s3.service');
const activityService = require('../../activity/services/activity.service');
const notificationService = require('../../notification/services/notification.service');

// ==========================================
// 1. QUẢN LÝ THẺ CÔNG VIỆC (TASK CORE)
// ==========================================
exports.createTask = async (req, res, next) => {
    try {
        // 1. CƠ CHẾ BẮT DỮ LIỆU CỨU HỘ
        // Nếu req.body rỗng, chúng ta thử đọc thủ công từ stream của request
        let taskData = req.body;

        if (!taskData || (typeof taskData === 'object' && Object.keys(taskData).length === 0)) {
            console.log("🔍 [DEBUG] req.body rỗng, đang đọc dữ liệu thô từ stream...");
            taskData = await new Promise((resolve) => {
                let chunks = [];
                req.on('data', (chunk) => chunks.push(chunk));
                req.on('end', () => {
                    try {
                        const rawBody = Buffer.concat(chunks).toString();
                        resolve(rawBody ? JSON.parse(rawBody) : null);
                    } catch (e) { 
                        console.error("❌ Lỗi parse dữ liệu thô:", e);
                        resolve(null); 
                    }
                });
            });
        }

        console.log("📥 [DEBUG] Payload cuối cùng nhận được:", JSON.stringify(taskData, null, 2));

        // 2. KIỂM TRA DỮ LIỆU
        if (!taskData || Object.keys(taskData).length === 0) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "INVALID_REQUEST",
                    message: "Không nhận được dữ liệu (body trống). Vui lòng kiểm tra lại phía Frontend."
                }
            });
        }

        // 3. CHUẨN HÓA PAYLOAD
        const payload = {
            ...taskData,
            board_id: taskData.board_id || taskData.boardId
        };

        // 4. VALIDATE BẮT BUỘC
        if (!payload.board_id) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_FAILED",
                    message: "Thiếu trường bắt buộc: board_id"
                }
            });
        }

        // 5. GỌI SERVICE
        const task = await taskCoreService.createTask(payload);

        // 6. LOG HOẠT ĐỘNG
        if (task && req.user) {
            await activityService.logActivity({
                action: 'CREATE',
                source: 'USER',
                actor_id: req.user.id,
                target_id: task._id,
                target_type: 'Task',
                project_id: task.project_id || payload.project_id || null,
                details: { message: 'Created a new task', title: task.title }
            });
        }
        
        // 7. TRẢ KẾT QUẢ
        res.status(201).json({ 
            success: true, 
            data: task, 
            message: 'Task created successfully' 
        });

    } catch (error) { 
        console.error("❌ Lỗi chi tiết tại taskController.createTask:", error);
        next(error); // Chuyển cho middleware xử lý lỗi tập trung
    }
};

exports.updateTask = async (req, res, next) => {
    try {
        const task = await taskCoreService.updateTask(req.params.id, req.body);

        // 🚀 TỐI ƯU BẮN THÔNG BÁO CHO NHIỀU NGƯỜI
        const assignees = req.body.assignees_user_id || (req.body.assignee_id ? [req.body.assignee_id] : []);
        
        if (assignees.length > 0) {
            // Lặp qua danh sách user để gửi thông báo cho từng người
            for (const userId of assignees) {
                await notificationService.queueNotification({
                    recipient_id: userId,
                    sender_id: req.user.id,
                    title: 'Được giao công việc mới',
                    message: `Bạn vừa được phân công vào task: ${task.title}`,
                    type: 'ASSIGN_TASK',
                    reference_id: task._id
                });
            }
        }

        await activityService.logActivity({
            action: 'UPDATE',
            source: 'USER',
            actor_id: req.user.id,
            target_id: task._id,
            target_type: 'Task',
            details: { message: 'Updated task details' }
        });

        res.status(200).json({ success: true, data: task, message: 'Task updated successfully' });
    } catch (error) { next(error); }
};

exports.deleteTask = async (req, res, next) => {
    try {
        await taskCoreService.deleteTask(req.params.id);

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
        const task = await taskCoreService.moveTask(req.params.id, destColumnId, newOrder);

        await activityService.logActivity({
            action: 'MOVE',
            source: 'USER',
            actor_id: req.user.id,
            target_id: task._id,
            target_type: 'Task',
            details: { message: 'Moved task to another column' }
        });

        res.status(200).json({ success: true, message: 'Task moved successfully', data: task });
    } catch (error) { next(error); }
};

// ==========================================
// 2. QUẢN LÝ CHECKLIST (SUBTASKS)
// ==========================================
exports.addSubtask = async (req, res, next) => {
    try {
        const task = await subtaskService.addSubtask(req.params.id, req.body.title);
        res.status(201).json({ success: true, data: task });
    } catch (error) { next(error); }
};

// Hàm thêm nhiều subtask phục vụ luồng nhận mảng dữ liệu phân tích từ AI
exports.addMultipleSubtasks = async (req, res, next) => {
    try {
        const task = await subtaskService.addMultipleSubtasks(req.params.id, req.body.titles);
        res.status(201).json({ success: true, data: task, message: 'Multiple subtasks added successfully' });
    } catch (error) { next(error); }
};

exports.updateSubtask = async (req, res, next) => {
    try {
        const task = await subtaskService.updateSubtask(req.params.id, req.params.subtaskId, req.body);
        res.status(200).json({ success: true, data: task });
    } catch (error) { next(error); }
};

exports.deleteSubtask = async (req, res, next) => {
    try {
        const task = await subtaskService.deleteSubtask(req.params.id, req.params.subtaskId);
        res.status(200).json({ success: true, data: task });
    } catch (error) { next(error); }
};

// ==========================================
// 3. QUẢN LÝ BÌNH LUẬN (COMMENTS)
// ==========================================
exports.addComment = async (req, res, next) => {
    try {
        const comment = await taskCommentService.addComment(req.params.id, req.user.id, req.body.content);
        res.status(201).json({ success: true, data: comment });
    } catch (error) { next(error); }
};

exports.getTaskComments = async (req, res, next) => {
    try {
        const comments = await taskCommentService.getTaskComments(req.params.id);
        res.status(200).json({ success: true, data: comments });
    } catch (error) { next(error); }
};

exports.updateComment = async (req, res, next) => {
    try {
        const comment = await taskCommentService.updateComment(req.params.commentId, req.user.id, req.body.content);
        res.status(200).json({ success: true, data: comment, message: 'Comment updated' });
    } catch (error) { next(error); }
};

exports.deleteComment = async (req, res, next) => {
    try {
        await taskCommentService.deleteComment(req.params.commentId, req.user.id);
        res.status(200).json({ success: true, message: 'Comment deleted successfully' });
    } catch (error) { next(error); }
};

// ==========================================
// 4. ĐÍNH KÈM FILE (ATTACHMENTS VIA AWS S3 - PRESIGNED URL)
// ==========================================
exports.getAttachmentUploadUrl = async (req, res, next) => {
    try {
        const { fileName, fileType } = req.body;
        if (!fileName || !fileType) {
            return res.status(400).json({ success: false, message: 'Missing fileName or fileType' });
        }
        const data = await s3Service.generateUploadUrl(fileName, fileType);
        res.status(200).json({ success: true, data });
    } catch (error) { next(error); }
};

exports.saveAttachmentMetadata = async (req, res, next) => {
    try {
        const { fileName, fileUrl, mimeType } = req.body;
        if (!fileName || !fileUrl) {
            return res.status(400).json({ success: false, message: 'Missing file metadata' });
        }

        const fileData = {
            file_name: fileName,
            file_url: fileUrl,
            mime_type: mimeType
        };
        
        const attachment = await taskAttachmentService.addAttachment(req.params.id, req.user.id, fileData);
        
        await activityService.logActivity({
            action: 'UPDATE', 
            source: 'USER',
            actor_id: req.user.id,
            target_id: req.params.id,
            target_type: 'Task',
            details: { message: `Attached file: ${fileName}` }
        });

        res.status(201).json({ success: true, data: attachment, message: 'Attachment metadata saved successfully' });
    } catch (error) { next(error); }
};

exports.getTaskAttachments = async (req, res, next) => {
    try {
        const attachments = await taskAttachmentService.getTaskAttachments(req.params.id);
        res.status(200).json({ success: true, data: attachments });
    } catch (error) { next(error); }
};

exports.deleteAttachment = async (req, res, next) => {
    try {
        await taskAttachmentService.deleteAttachment(req.params.attachmentId, req.user.id);
        res.status(200).json({ success: true, message: 'Attachment deleted' });
    } catch (error) { next(error); }
};

// ==========================================
// 5. NHẬT KÝ HOẠT ĐỘNG (ACTIVITY LOGS)
// ==========================================
exports.getTaskActivities = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const activities = await activityService.getActivitiesByTarget('Task', req.params.id, page, limit);
        res.status(200).json({ success: true, data: activities });
    } catch (error) { next(error); }
};
// Thêm vào khối 1. QUẢN LÝ THẺ CÔNG VIỆC (TASK CORE)
exports.getMyTasks = async (req, res, next) => {
    try {
        const tasks = await taskCoreService.getMyTasks(req.user.id);
        res.status(200).json({ success: true, data: tasks });
    } catch (error) { next(error); }
};