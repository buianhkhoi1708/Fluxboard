const Task = require('../models/task.model');
const Column = require('../../column/models/column.model'); 
const AppError = require('../../../common/exceptions/AppError');
const socketConfig = require('../../../common/config/socket');
const Comment = require('../models/comment.model');
const Attachment = require('../models/attachment.model');

const eventBus = require('../../../common/utils/eventBus');

exports.createTask = async (taskData) => {
    // Lưu Task (Chỉ lưu các field có trong Task Model mới)
    const task = await Task.create(taskData);
    await Column.findByIdAndUpdate(
        taskData.column_id,
        { $push: { task_order_ids: task._id } }
    );

    eventBus.emit('task_created', {
        task_id: task._id,
        start_date: taskData.start_date, // Thông tin này do Frontend gửi lên
        due_date: taskData.due_date,
        extension_limit: taskData.extension_limit
    });

    const io = socketConfig.getIo();
    io.to(taskData.board_id.toString()).emit('taskCreated', task);
    return task;
};

exports.updateTask = async (taskId, updateData) => {
    try {
        const oldTask = await Task.findById(taskId).lean();
        if (!oldTask) throw new AppError('Task not found', 404, 'NOT_FOUND');

        const task = await Task.findByIdAndUpdate(
            taskId,
            { $set: updateData },
            { returnDocument: 'after', runValidators: true }
        );

        if (!oldTask.is_done && task.is_done) {
            eventBus.emit('task_completed', { task_id: task._id });
        }

        const io = socketConfig.getIo();
        io.to(task.board_id.toString()).emit('taskUpdated', task);

        return task;
    } catch (error) {
        throw error;
    }
};

exports.deleteTask = async (taskId) => {
    const task = await Task.findByIdAndUpdate(taskId, { is_deleted: true }, { new: true }).lean();
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
// ĐỢT 3: QUẢN LÝ CHECKLIST (SUBTASKS)
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
// ĐỢT 3: QUẢN LÝ BÌNH LUẬN (COMMENTS)
// ==========================================

exports.addComment = async (taskId, userId, content) => {
    const task = await Task.findById(taskId);
    if (!task) throw new AppError('Task not found', 404, 'NOT_FOUND');

    const comment = await Comment.create({ task_id: taskId, user_id: userId, content });
    await comment.populate('user_id', 'full_name email');

    const io = socketConfig.getIo();
    io.to(task.board_id.toString()).emit('commentAdded', comment);
    return comment;
};

exports.getTaskComments = async (taskId) => {
    return await Comment.find({ task_id: taskId })
        .populate('user_id', 'full_name email')
        .sort({ created_at: -1 });
};

exports.deleteComment = async (commentId, userId) => {
    const comment = await Comment.findById(commentId);
    if (!comment) throw new AppError('Comment not found', 404, 'NOT_FOUND');

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

    const io = socketConfig.getIo();
    io.to(task.board_id.toString()).emit('attachmentAdded', attachment);

    return attachment;
};

exports.getTaskAttachments = async (taskId) => {
    return await Attachment.find({ task_id: taskId }).sort({ created_at: -1 });
};