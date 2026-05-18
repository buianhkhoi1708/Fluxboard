const Task = require('../models/task.model');
const Column = require('../../column/models/column.model'); 
const AppError = require('../../../common/exceptions/AppError');
const socketConfig = require('../../../common/config/socket');
const eventBus = require('../../../common/utils/eventBus');

const emitBoardEvent = (boardId, eventName, payload) => {
    const io = socketConfig.getIo();
    if (boardId) io.to(boardId.toString()).emit(eventName, payload);
};

exports.createTask = async (taskData) => {
    const task = await Task.create(taskData);
    
    await Column.findByIdAndUpdate(
        taskData.column_id,
        { $push: { task_order_ids: task._id } }
    );

    eventBus.emit('task_created', {
        task_id: task._id,
        start_date: taskData.start_date, 
        due_date: taskData.due_date,
        extension_limit: taskData.extension_limit
    });

    emitBoardEvent(taskData.board_id, 'taskCreated', task);
    return task;
};

exports.updateTask = async (taskId, updateData) => {
    const oldTask = await Task.findById(taskId).lean();
    if (!oldTask) throw new AppError('Task not found', 404, 'NOT_FOUND');

    const task = await Task.findByIdAndUpdate(
        taskId,
        { $set: updateData },
        { new: true, runValidators: true }
    );

    if (!oldTask.is_done && task.is_done) {
        eventBus.emit('task_completed', { task_id: task._id });
    }

    // 💡 BẮN SỰ KIỆN QUA EVENT BUS KHI TASK BỊ THAY ĐỔI
    eventBus.emit('system_task_updated', { taskId: task._id });

    emitBoardEvent(task.board_id, 'taskUpdated', task);
    return task;
};

exports.deleteTask = async (taskId) => {
    const task = await Task.findByIdAndUpdate(
        taskId, 
        { is_deleted: true }, 
        { new: true }
    ).lean();
    
    if (!task) throw new AppError('Task not found', 404, 'NOT_FOUND');

    await Column.findByIdAndUpdate(
        task.column_id,
        { $pull: { task_order_ids: taskId } }
    );

    emitBoardEvent(task.board_id, 'taskDeleted', taskId);
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

    // 💡 BẮN SỰ KIỆN QUA EVENT BUS KHI KÉO THẢ TASK SANG CỘT KHÁC
    eventBus.emit('system_task_moved', { taskId: task._id, destColumnId });

    emitBoardEvent(task.board_id, 'taskMoved', { taskId: task._id, destColumnId, newOrder });
    return task;
};