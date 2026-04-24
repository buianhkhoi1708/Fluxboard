const Task = require('../models/task.model');
const AppError = require('../../../common/exceptions/AppError');
const socketConfig = require('../../../common/config/socket');

exports.createTask = async (taskData) => {
    const taskCount = await Task.countDocuments({ column_id: taskData.column_id });
    const task = await Task.create({ ...taskData, order: taskCount });

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

    const io = socketConfig.getIo();
    io.to(task.board_id.toString()).emit('taskDeleted', taskId);
    
    return true;
};

exports.moveTask = async (taskId, destColumnId, newOrder) => {
    const task = await Task.findById(taskId);
    if (!task) throw new AppError('Task not found', 404, 'NOT_FOUND');

    const sourceColumnId = task.column_id;
    const oldOrder = task.order;

    if (sourceColumnId.toString() === destColumnId.toString()) {
        if (oldOrder === newOrder) return task;
        if (oldOrder < newOrder) {
            await Task.updateMany(
                { column_id: sourceColumnId, order: { $gt: oldOrder, $lte: newOrder } },
                { $inc: { order: -1 } }
            );
        } else {
            await Task.updateMany(
                { column_id: sourceColumnId, order: { $gte: newOrder, $lt: oldOrder } },
                { $inc: { order: 1 } }
            );
        }
    } else {
        await Task.updateMany(
            { column_id: sourceColumnId, order: { $gt: oldOrder } },
            { $inc: { order: -1 } }
        );
        await Task.updateMany(
            { column_id: destColumnId, order: { $gte: newOrder } },
            { $inc: { order: 1 } }
        );
    }

    task.column_id = destColumnId;
    task.order = newOrder;
    await task.save();

    const io = socketConfig.getIo();
    io.to(task.board_id.toString()).emit('taskMoved', { taskId: task._id, destColumnId, newOrder });

    return task;
};