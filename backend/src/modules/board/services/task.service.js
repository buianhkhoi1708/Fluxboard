const Task = require('../models/task.model');
const Column = require('../models/column.model'); // Thêm Column model
const AppError = require('../../../common/exceptions/AppError');
const socketConfig = require('../../../common/config/socket');

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