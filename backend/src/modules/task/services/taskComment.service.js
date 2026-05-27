const Task = require('../models/task.model');
const Comment = require('../models/comment.model');
const AppError = require('../../../common/exceptions/AppError');
const socketConfig = require('../../../common/config/socket');

const getId = (value) => String(value?._id || value?.id || value || '');

const emitBoardEvent = (boardId, eventName, payload) => {
    const io = socketConfig.getIo();
    if (!io || !boardId) return;

    const safeBoardId = String(boardId);
    const channelName = `/topic/board/${safeBoardId}`;

    io.to(safeBoardId).emit(eventName, payload);
    io.emit(channelName, {
        boardId: safeBoardId,
        action: eventName,
        payload
    });
};

const populateComment = async (comment) => {
    await comment.populate('user_id', 'full_name email avatar_url');
    await comment.populate('resolved_by_user_id', 'full_name email avatar_url');
    return comment;
};

exports.addComment = async (taskId, userId, content) => {
    const finalContent = String(content || '').trim();
    if (!finalContent) throw new AppError('Nội dung bình luận không được để trống.', 400, 'BAD_REQUEST');

    const task = await Task.findById(taskId);
    if (!task) throw new AppError('Không tìm thấy công việc.', 404, 'NOT_FOUND');

    const comment = await Comment.create({
        task_id: taskId,
        user_id: userId,
        content: finalContent
    });

    await populateComment(comment);
    emitBoardEvent(task.board_id, 'COMMENT_ADDED', { taskId, comment });

    return comment;
};

exports.getTaskComments = async (taskId) => {
    return await Comment.find({ task_id: taskId })
        .populate('user_id', 'full_name email avatar_url')
        .populate('resolved_by_user_id', 'full_name email avatar_url')
        .sort({ created_at: 1 });
};

exports.updateComment = async (commentId, userId, content) => {
    const finalContent = String(content || '').trim();
    if (!finalContent) throw new AppError('Nội dung bình luận không được để trống.', 400, 'BAD_REQUEST');

    const comment = await Comment.findById(commentId);
    if (!comment) throw new AppError('Không tìm thấy bình luận.', 404, 'NOT_FOUND');

    if (getId(comment.user_id) !== getId(userId)) {
        throw new AppError('Bạn không có quyền sửa bình luận này.', 403, 'FORBIDDEN');
    }

    comment.content = finalContent;
    await comment.save();
    await populateComment(comment);

    const task = await Task.findById(comment.task_id);
    if (task) emitBoardEvent(task.board_id, 'COMMENT_UPDATED', { taskId: getId(comment.task_id), comment });

    return comment;
};

exports.resolveComment = async (commentId, userId, isResolved = true) => {
    const comment = await Comment.findById(commentId);
    if (!comment) throw new AppError('Không tìm thấy bình luận.', 404, 'NOT_FOUND');

    comment.is_resolved = !!isResolved;
    comment.resolved_by_user_id = isResolved ? userId : null;
    comment.resolved_at = isResolved ? new Date() : null;

    await comment.save();
    await populateComment(comment);

    const task = await Task.findById(comment.task_id);
    if (task) emitBoardEvent(task.board_id, 'COMMENT_RESOLVED', { taskId: getId(comment.task_id), comment });

    return comment;
};

exports.deleteComment = async (commentId, userId) => {
    const comment = await Comment.findById(commentId);
    if (!comment) throw new AppError('Không tìm thấy bình luận.', 404, 'NOT_FOUND');

    if (getId(comment.user_id) !== getId(userId)) {
        throw new AppError('Bạn không có quyền xóa bình luận này.', 403, 'FORBIDDEN');
    }

    const task = await Task.findById(comment.task_id);
    await Comment.findByIdAndDelete(commentId);

    if (task) {
        emitBoardEvent(task.board_id, 'COMMENT_DELETED', {
            taskId: getId(comment.task_id),
            commentId
        });
    }

    return true;
};

exports.deleteAllByTaskId = async (taskId) => {
    await Comment.deleteMany({ task_id: taskId });
};