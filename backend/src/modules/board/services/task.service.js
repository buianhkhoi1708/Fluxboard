const Task = require('../models/task.model');
const Column = require('../models/column.model'); 
const AppError = require('../../../common/exceptions/AppError');
const socketConfig = require('../../../common/config/socket');
const Comment = require('../models/comment.model');
const Activity = require('../models/activity.model');
const Attachment = require('../models/attachment.model');

exports.createTask = async (taskData) => {
    // 1. Tạo Task mới (Không cần đếm order nữa)
    const task = await Task.create(taskData);

    // 2. Đẩy ID của task mới vào cuối mảng của Cột
    await Column.findByIdAndUpdate(
        taskData.column_id,
        { $push: { task_order_ids: task._id } }
    );

    // 3. Emit qua Socket
    const io = socketConfig.getIo();
    io.to(taskData.board_id.toString()).emit('taskCreated', task);

    return task;
};

exports.updateTask = async (taskId, updateData) => {
    const task = await Task.findByIdAndUpdate(
        taskId, 
        { $set: updateData }, 
        { new: true, runValidators: true }
    ).lean();
    
    if (!task) throw new AppError('Task not found', 404, 'NOT_FOUND');
    
    const io = socketConfig.getIo();
    io.to(task.board_id.toString()).emit('taskUpdated', task);
    
    return task;
};

exports.deleteTask = async (taskId) => {
    const task = await Task.findByIdAndDelete(taskId).lean();
    if (!task) throw new AppError('Task not found', 404, 'NOT_FOUND');

    await Column.findByIdAndUpdate(
        task.column_id,
        { $pull: { task_order_ids: taskId } }
    );

    const io = socketConfig.getIo();
    io.to(task.board_id.toString()).emit('taskDeleted', taskId);
    
    return true;
};

exports.moveTask = async (taskId, destColumnId, newOrder) => {
    const task = await Task.findById(taskId);
    if (!task) throw new AppError('Task not found', 404, 'NOT_FOUND');

    const sourceColumnId = task.column_id;

    if (sourceColumnId.toString() === destColumnId.toString()) {
        const column = await Column.findById(sourceColumnId);
        
        column.task_order_ids = column.task_order_ids.filter(id => id.toString() !== taskId.toString());
        column.task_order_ids.splice(newOrder, 0, taskId);
        
        await column.save();
    } else {
        const [sourceCol, destCol] = await Promise.all([
            Column.findById(sourceColumnId),
            Column.findById(destColumnId)
        ]);

        sourceCol.task_order_ids = sourceCol.task_order_ids.filter(id => id.toString() !== taskId.toString());
        destCol.task_order_ids.splice(newOrder, 0, taskId);
        task.column_id = destColumnId;

        await Promise.all([sourceCol.save(), destCol.save(), task.save()]);
    }

    const io = socketConfig.getIo();
    io.to(task.board_id.toString()).emit('taskMoved', { taskId: task._id, destColumnId, newOrder });

    return task;
};

// ==========================================
// QUẢN LÝ CHECKLIST (SUBTASKS)
// ==========================================

exports.addSubtask = async (taskId, title) => {
    const task = await Task.findById(taskId);
    if (!task) throw new AppError('Task not found', 404, 'NOT_FOUND');

    task.subtasks.push({ title, is_done: false });
    await task.save();

    const io = socketConfig.getIo();
    io.to(task.board_id.toString()).emit('taskUpdated', task);

    return task;
};

exports.updateSubtask = async (taskId, subtaskId, updateData) => {
    const task = await Task.findById(taskId);
    if (!task) throw new AppError('Task not found', 404, 'NOT_FOUND');

    const subtask = task.subtasks.id(subtaskId);
    if (!subtask) throw new AppError('Subtask not found', 404, 'NOT_FOUND');

    if (updateData.title !== undefined) subtask.title = updateData.title;
    if (updateData.is_done !== undefined) subtask.is_done = updateData.is_done;

    await task.save();

    const io = socketConfig.getIo();
    io.to(task.board_id.toString()).emit('taskUpdated', task);

    return task;
};

exports.deleteSubtask = async (taskId, subtaskId) => {
    const task = await Task.findById(taskId);
    if (!task) throw new AppError('Task not found', 404, 'NOT_FOUND');

    task.subtasks.pull(subtaskId);
    await task.save();

    const io = socketConfig.getIo();
    io.to(task.board_id.toString()).emit('taskUpdated', task);

    return task;
};
// ==========================================
// QUẢN LÝ BÌNH LUẬN (COMMENTS)
// ==========================================
exports.addComment = async (taskId, userId, content) => {
    // 1. Kiểm tra Task có tồn tại không
    const task = await Task.findById(taskId);
    if (!task) throw new AppError('Task not found', 404, 'NOT_FOUND');

    // 2. Tạo bình luận mới
    const comment = await Comment.create({ task_id: taskId, user_id: userId, content });
    
    // 3. Lấy thêm thông tin User (Tên, Email) để FE hiển thị Avatar
    await comment.populate('user_id', 'full_name email');

    // 4. Emit socket cho những người khác đang xem bảng
    const io = socketConfig.getIo();
    io.to(task.board_id.toString()).emit('commentAdded', comment);

    return comment;
};

exports.getTaskComments = async (taskId) => {
    // Lấy toàn bộ bình luận của Task này, sắp xếp mới nhất lên đầu
    return await Comment.find({ task_id: taskId })
        .populate('user_id', 'full_name email')
        .sort({ created_at: -1 });
};

exports.deleteComment = async (commentId, userId) => {
    const comment = await Comment.findById(commentId);
    if (!comment) throw new AppError('Comment not found', 404, 'NOT_FOUND');

    // Kiểm tra xem người xóa có phải là chủ nhân của bình luận không
    if (comment.user_id.toString() !== userId.toString()) {
        throw new AppError('Bạn không có quyền xóa bình luận của người khác!', 403, 'FORBIDDEN');
    }

    const task = await Task.findById(comment.task_id);
    await comment.deleteOne();

    const io = socketConfig.getIo();
    io.to(task.board_id.toString()).emit('commentDeleted', commentId);

    return true;
};

// ==========================================
// ĐỢT 3: LỊCH SỬ HOẠT ĐỘNG (ACTIVITY LOGS)
// ==========================================

// Hàm nội bộ để lưu Log (Dùng để gọi ké trong các hàm kéo thả, sửa, xóa...)
exports.logActivity = async (taskId, userId, action, details) => {
    const activity = await Activity.create({
        task_id: taskId,
        user_id: userId,
        action,
        details
    });
    
    const task = await Task.findById(taskId);
    // Bắn socket thông báo có log mới
    const io = socketConfig.getIo();
    io.to(task.board_id.toString()).emit('activityLogged', activity);
};

// Hàm lấy danh sách Log để FE hiển thị
exports.getTaskActivities = async (taskId) => {
    return await Activity.find({ task_id: taskId })
        .populate('user_id', 'full_name avatar') // Lấy tên người thực hiện
        .sort({ created_at: -1 }); // Mới nhất lên đầu
};

// ==========================================
// ĐỢT 3: ĐÍNH KÈM FILE (AWS S3)
// ==========================================

exports.addAttachment = async (taskId, userId, fileData) => {
    const task = await Task.findById(taskId);
    if (!task) throw new AppError('Task not found', 404, 'NOT_FOUND');

    const attachment = await Attachment.create({
        task_id: taskId,
        user_id: userId,
        file_name: fileData.file_name,
        file_url: fileData.file_url,
        mime_type: fileData.mime_type
    });

    await exports.logActivity(taskId, userId, 'UPLOADED', `uploaded a file: ${fileData.file_name}`);

    const io = socketConfig.getIo();
    io.to(task.board_id.toString()).emit('attachmentAdded', attachment);

    return attachment;
};

exports.getTaskAttachments = async (taskId) => {
    return await Attachment.find({ task_id: taskId }).sort({ created_at: -1 });
};