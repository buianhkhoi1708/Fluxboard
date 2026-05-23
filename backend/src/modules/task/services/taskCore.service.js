const Task = require('../models/task.model');
const Column = require('../../column/models/column.model'); 
const AppError = require('../../../common/exceptions/AppError');
const socketConfig = require('../../../common/config/socket');
const eventBus = require('../../../common/utils/eventBus');
const taskAttachmentService = require('./taskAttachment.service');
const taskCommentService = require('./taskComment.service');
const TaskDeadline = require('../../deadline/models/taskDeadline.model'); // Đã import bảng Deadline

const emitBoardEvent = (boardId, eventName, payload) => {
    const io = socketConfig.getIo();
    if (boardId) io.to(boardId.toString()).emit(eventName, payload);
};

exports.createTask = async (taskData) => {
    // 1. Lưu thông tin cơ bản vào bảng Task
    const task = await Task.create(taskData);
    
    // 2. 🚀 Xử lý lưu ngày tháng sang bảng TaskDeadline
    let deadline = null;
    if (taskData.due_date) {
        deadline = await TaskDeadline.create({
            task_id: task._id,
            start_date: taskData.start_date || null,
            due_date: taskData.due_date
        });
    }

    // 3. Cập nhật vị trí Task vào Cột
    await Column.findByIdAndUpdate(
        taskData.column_id,
        { $push: { task_order_ids: task._id } }
    );

    eventBus.emit('task_created', {
        task_id: task._id,
        start_date: taskData.start_date, 
        due_date: taskData.due_date,
        extension_limit: taskData.extension_limit || 2
    });

    // 4. 🚀 Bơm ngày tháng vào object trả về để Frontend hiện ngay lập tức
    const taskObj = task.toObject();
    if (deadline) {
        taskObj.start_date = deadline.start_date;
        taskObj.due_date = deadline.due_date;
    }

    emitBoardEvent(taskData.board_id, 'taskCreated', taskObj);
    return taskObj;
};

exports.updateTask = async (taskId, updateData) => {
    const oldTask = await Task.findById(taskId).lean();
    if (!oldTask) throw new AppError('Task not found', 404, 'NOT_FOUND');

    // 1. Cập nhật bảng Task
    const task = await Task.findByIdAndUpdate(
        taskId,
        { $set: updateData },
        { new: true, runValidators: true }
    );

    // 2. 🚀 Cập nhật hoặc Tạo mới ngày tháng bên bảng TaskDeadline
    let deadline = null;
    if (updateData.start_date !== undefined || updateData.due_date !== undefined) {
        const deadlinePayload = {};
        if (updateData.start_date !== undefined) deadlinePayload.start_date = updateData.start_date;
        if (updateData.due_date !== undefined) deadlinePayload.due_date = updateData.due_date;
        
        // Dùng upsert: Nếu chưa có deadline thì tạo mới, có rồi thì cập nhật
        if (Object.keys(deadlinePayload).length > 0) {
            deadline = await TaskDeadline.findOneAndUpdate(
                { task_id: taskId },
                { $set: deadlinePayload },
                { new: true, upsert: true } 
            );
        }
    }

    if (!oldTask.is_done && task.is_done) {
        eventBus.emit('task_completed', { task_id: task._id });
        // 🚀 Cập nhật ngày hoàn thành thực tế vào Deadline
        await TaskDeadline.findOneAndUpdate(
            { task_id: taskId },
            { $set: { actual_completed_at: new Date() } }
        );
    }

    eventBus.emit('system_task_updated', { taskId: task._id });

    // 3. 🚀 Bơm dữ liệu ngày tháng trả về cho UI
    const taskObj = task.toObject();
    if (deadline) {
        taskObj.start_date = deadline.start_date;
        taskObj.due_date = deadline.due_date;
    } else {
        // Dự phòng: load lại deadline từ DB nếu không có cập nhật trong đợt này
        const existingDeadline = await TaskDeadline.findOne({ task_id: taskId }).lean();
        if (existingDeadline) {
            taskObj.start_date = existingDeadline.start_date;
            taskObj.due_date = existingDeadline.due_date;
        }
    }

    emitBoardEvent(task.board_id, 'taskUpdated', taskObj);
    return taskObj;
};

exports.deleteTask = async (taskId) => {
    const task = await Task.findById(taskId);
    if (!task) throw new AppError('Task not found', 404, 'NOT_FOUND');

    // Dọn rác sạch sẽ ở mọi bảng liên quan
    await taskCommentService.deleteAllByTaskId(taskId);
    await taskAttachmentService.deleteAllByTaskId(taskId);
    await TaskDeadline.findOneAndDelete({ task_id: taskId }); // 🚀 Xóa luôn deadline

    eventBus.emit('task_deleted', { task_id: taskId });

    await Column.findByIdAndUpdate(
        task.column_id,
        { $pull: { task_order_ids: taskId } }
    );

    await Task.findByIdAndDelete(taskId);

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

    eventBus.emit('system_task_moved', { taskId: task._id, destColumnId });

    emitBoardEvent(task.board_id, 'taskMoved', { taskId: task._id, destColumnId, newOrder });
    return task;
};

exports.getMyTasks = async (userId) => {
    const tasks = await Task.find({ 
        // 🚀 CẬP NHẬT: Tìm ID của user ở cả trường cũ lẫn trường mảng mới
        $or: [
            { assignee_id: userId },
            { assignees_user_id: userId } // Tìm trong mảng
        ],
        is_deleted: false 
    })
    .populate('board_id', 'name')
    .populate('column_id', 'name')
    .sort({ created_at: -1 })
    .lean();
    
    // 🚀 Load thêm Deadline cho My Tasks
    for (let t of tasks) {
        const dl = await TaskDeadline.findOne({ task_id: t._id }).lean();
        if (dl) {
            t.start_date = dl.start_date;
            t.due_date = dl.due_date;
        }
    }
    
    return tasks;
};