const Task = require('../models/task.model');
const Attachment = require('../models/attachment.model');
const AppError = require('../../../common/exceptions/AppError');
const socketConfig = require('../../../common/config/socket');

const emitBoardEvent = (boardId, eventName, payload) => {
    const io = socketConfig.getIo();
    if (boardId) io.to(boardId.toString()).emit(eventName, payload);
};

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

    emitBoardEvent(task.board_id, 'attachmentAdded', attachment);
    return attachment;
};

exports.getTaskAttachments = async (taskId) => {
    return await Attachment.find({ task_id: taskId }).sort({ created_at: -1 });
};