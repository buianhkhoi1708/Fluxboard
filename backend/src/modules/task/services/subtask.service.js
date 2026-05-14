const Task = require('../models/task.model');
const AppError = require('../../../common/exceptions/AppError');
const socketConfig = require('../../../common/config/socket');

const emitBoardEvent = (boardId, eventName, payload) => {
    const io = socketConfig.getIo();
    if (boardId) io.to(boardId.toString()).emit(eventName, payload);
};

exports.addSubtask = async (taskId, title) => {
    const task = await Task.findById(taskId);
    if (!task) throw new AppError('Task not found', 404, 'NOT_FOUND');

    task.subtasks.push({ title, is_done: false });
    await task.save();

    emitBoardEvent(task.board_id, 'taskUpdated', task);
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

    emitBoardEvent(task.board_id, 'taskUpdated', task);
    return task;
};

exports.deleteSubtask = async (taskId, subtaskId) => {
    const task = await Task.findById(taskId);
    if (!task) throw new AppError('Task not found', 404, 'NOT_FOUND');

    task.subtasks.pull(subtaskId);
    await task.save();

    emitBoardEvent(task.board_id, 'taskUpdated', task);
    return task;
};