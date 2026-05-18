const Task = require('../models/task.model');
const Comment = require('../models/comment.model');
const AppError = require('../../../common/exceptions/AppError');
const socketConfig = require('../../../common/config/socket');

const emitBoardEvent = (boardId, eventName, payload) => {
    const io = socketConfig.getIo();
    if (boardId) io.to(boardId.toString()).emit(eventName, payload);
};

exports.addComment = async (taskId, userId, content) => {
    const task = await Task.findById(taskId);
    if (!task) throw new AppError('Task not found', 404, 'NOT_FOUND');

    const comment = await Comment.create({ task_id: taskId, user_id: userId, content });
    await comment.populate('user_id', 'full_name email');

    emitBoardEvent(task.board_id, 'commentAdded', comment);
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
        throw new AppError('You do not have permission to delete this comment', 403, 'FORBIDDEN');
    }

    const task = await Task.findById(comment.task_id);
    await comment.deleteOne();

    emitBoardEvent(task.board_id, 'commentDeleted', commentId);
    return true;
};