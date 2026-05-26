const Task = require('../models/task.model');
const Column = require('../../column/models/column.model');
const Board = require('../../board/models/board.model');
const AppError = require('../../../common/exceptions/AppError');
const socketConfig = require('../../../common/config/socket');
const eventBus = require('../../../common/utils/eventBus');
const taskAttachmentService = require('./taskAttachment.service');
const taskCommentService = require('./taskComment.service');
const TaskDeadline = require('../../deadline/models/taskDeadline.model');

const emitBoardEvent = (boardId, eventName, payload) => {
    const io = socketConfig.getIo();

    if (io && boardId) {
        io.to(boardId.toString()).emit(eventName, payload);
    }
};

const toIdString = (value) => {
    if (!value) return null;
    if (typeof value === 'object' && value._id) return value._id.toString();
    return value.toString();
};

const normalizeAssignees = (value, fallbackAssigneeId = null) => {
    const rawList = Array.isArray(value)
        ? value
        : value
            ? [value]
            : fallbackAssigneeId
                ? [fallbackAssigneeId]
                : [];

    const uniqueIds = [];

    rawList.forEach((item) => {
        const id =
            typeof item === 'object'
                ? item.user_id || item.id || item._id
                : item;

        const idString = toIdString(id);

        if (idString && !uniqueIds.includes(idString)) {
            uniqueIds.push(idString);
        }
    });

    return uniqueIds;
};

const getProjectIdFromBoard = async (boardId) => {
    if (!boardId) return null;

    const board = await Board.findById(boardId)
        .select('project_id')
        .lean();

    return board?.project_id || null;
};

const normalizeTaskPayload = async (taskData = {}, actorId = null) => {
    const payload = {
        ...taskData
    };

    payload.board_id = payload.board_id || payload.boardId;
    payload.column_id = payload.column_id || payload.columnId;

    if (!payload.board_id) {
        throw new AppError('Missing required field: board_id', 400, 'VALIDATION_FAILED');
    }

    if (!payload.column_id) {
        throw new AppError('Missing required field: column_id', 400, 'VALIDATION_FAILED');
    }

    if (!payload.project_id) {
        payload.project_id = await getProjectIdFromBoard(payload.board_id);
    }

    if (!payload.author_user_id) {
        payload.author_user_id = actorId || payload.created_by || payload.user_id || null;
    }

    payload.assignees_user_id = normalizeAssignees(
        payload.assignees_user_id || payload.assigneesUserId || payload.assignees,
        payload.assignee_id
    );

    payload.assignee_id =
        payload.assignee_id ||
        (payload.assignees_user_id.length > 0 ? payload.assignees_user_id[0] : null);

    if (payload.status === 'DONE' || payload.is_done === true) {
        payload.status = 'DONE';
        payload.is_done = true;
        payload.completed_at = payload.completed_at || new Date();
        payload.completed_by_user_id = payload.completed_by_user_id || actorId || null;
    } else {
        payload.is_done = Boolean(payload.is_done);
        payload.status = payload.status || 'TODO';
        payload.completed_at = null;
        payload.completed_by_user_id = null;
    }

    return payload;
};

const normalizeTaskUpdatePayload = (updateData = {}, oldTask = null, actorId = null) => {
    const payload = {
        ...updateData
    };

    delete payload.boardId;
    delete payload.columnId;

    if (payload.assignees_user_id || payload.assigneesUserId || payload.assignees || payload.assignee_id) {
        payload.assignees_user_id = normalizeAssignees(
            payload.assignees_user_id || payload.assigneesUserId || payload.assignees,
            payload.assignee_id
        );

        payload.assignee_id =
            payload.assignee_id ||
            (payload.assignees_user_id.length > 0 ? payload.assignees_user_id[0] : null);
    }

    const wantsDone =
        payload.is_done === true ||
        payload.status === 'DONE';

    const wantsUndone =
        payload.is_done === false ||
        (payload.status && payload.status !== 'DONE');

    if (wantsDone) {
        payload.is_done = true;
        payload.status = 'DONE';

        if (!oldTask?.is_done && oldTask?.status !== 'DONE') {
            payload.completed_at = new Date();
            payload.completed_by_user_id = actorId || null;
        }
    }

    if (wantsUndone && !wantsDone) {
        payload.is_done = false;
        payload.completed_at = null;
        payload.completed_by_user_id = null;

        if (!payload.status || payload.status === 'DONE') {
            payload.status = 'TODO';
        }
    }

    return payload;
};

const syncTaskDeadline = async (taskId, payload) => {
    const shouldTouchDeadline =
        Object.prototype.hasOwnProperty.call(payload, 'start_date') ||
        Object.prototype.hasOwnProperty.call(payload, 'due_date');

    if (!shouldTouchDeadline) {
        return null;
    }

    const wantsClearDueDate =
        payload.due_date === null ||
        payload.due_date === undefined ||
        payload.due_date === '';

    if (wantsClearDueDate) {
        await TaskDeadline.findOneAndDelete({ task_id: taskId });
        return null;
    }

    const existingDeadline = await TaskDeadline.findOne({ task_id: taskId });

    if (existingDeadline) {
        if (Object.prototype.hasOwnProperty.call(payload, 'start_date')) {
            existingDeadline.start_date = payload.start_date || null;
        }

        if (Object.prototype.hasOwnProperty.call(payload, 'due_date')) {
            existingDeadline.due_date = payload.due_date;
        }

        await existingDeadline.save();

        return existingDeadline;
    }

    if (!payload.due_date) {
        return null;
    }

    return await TaskDeadline.create({
        task_id: taskId,
        start_date: payload.start_date || null,
        due_date: payload.due_date
    });
};

const appendDeadlineToTaskObject = async (task, deadline = null) => {
    const taskObj =
        typeof task.toObject === 'function'
            ? task.toObject()
            : { ...task };

    let deadlineRecord = deadline;

    if (!deadlineRecord) {
        deadlineRecord = await TaskDeadline.findOne({ task_id: taskObj._id }).lean();
    }

    if (deadlineRecord) {
        taskObj.start_date = deadlineRecord.start_date;
        taskObj.due_date = deadlineRecord.due_date;
        taskObj.deadline_info = deadlineRecord;
    }

    return taskObj;
};

const updateDeadlineCompletionStatus = async (taskId, task, completedAt) => {
    const deadlineRecord = await TaskDeadline.findOne({ task_id: taskId }).lean();

    const dueDate =
        deadlineRecord?.due_date ||
        task?.due_date ||
        null;

    if (!deadlineRecord) {
        return null;
    }

    const isLate =
        dueDate &&
        new Date(completedAt).getTime() > new Date(dueDate).getTime();

    return await TaskDeadline.findOneAndUpdate(
        { task_id: taskId },
        {
            $set: {
                actual_completed_at: completedAt,
                completion_status: isLate ? 'LATE' : 'ON_TIME',
                late_minutes: isLate
                    ? Math.max(
                        0,
                        Math.ceil(
                            (new Date(completedAt).getTime() - new Date(dueDate).getTime()) /
                            60000
                        )
                    )
                    : 0
            }
        },
        { new: true }
    );
};

exports.createTask = async (taskData, actorId = null) => {
    const payload = await normalizeTaskPayload(taskData, actorId);

    const task = await Task.create(payload);

    let deadline = null;

    if (payload.due_date) {
        deadline = await TaskDeadline.create({
            task_id: task._id,
            start_date: payload.start_date || null,
            due_date: payload.due_date
        });
    }

    await Column.findByIdAndUpdate(
        payload.column_id,
        { $push: { task_order_ids: task._id } }
    );

    eventBus.emit('task_created', {
        task_id: task._id,
        taskId: task._id,
        userId: actorId || payload.author_user_id || null,
        senderId: actorId || payload.author_user_id || null,
        boardId: payload.board_id,
        projectId: payload.project_id,
        start_date: payload.start_date,
        due_date: payload.due_date,
        extension_limit: payload.extension_limit || 2
    });

    const taskObj = await appendDeadlineToTaskObject(task, deadline);

    emitBoardEvent(payload.board_id, 'taskCreated', taskObj);

    return taskObj;
};

exports.updateTask = async (taskId, updateData, actorId = null) => {
    const oldTask = await Task.findById(taskId).lean();

    if (!oldTask || oldTask.is_deleted) {
        throw new AppError('Task not found', 404, 'NOT_FOUND');
    }

    const payload = normalizeTaskUpdatePayload(updateData, oldTask, actorId);

    const task = await Task.findByIdAndUpdate(
        taskId,
        { $set: payload },
        { new: true, runValidators: true }
    );

    if (!task) {
        throw new AppError('Task not found', 404, 'NOT_FOUND');
    }

    let deadline = null;

    if (
        Object.prototype.hasOwnProperty.call(payload, 'start_date') ||
        Object.prototype.hasOwnProperty.call(payload, 'due_date')
    ) {
        deadline = await syncTaskDeadline(taskId, payload);
    }

    const wasDoneBefore = oldTask.is_done === true || oldTask.status === 'DONE';
    const isDoneNow = task.is_done === true || task.status === 'DONE';
    const justCompleted = !wasDoneBefore && isDoneNow;

    if (justCompleted) {
        const completedAt = task.completed_at || new Date();

        deadline = await updateDeadlineCompletionStatus(taskId, task, completedAt);

        eventBus.emit('task_completed', {
            task_id: task._id,
            taskId: task._id,
            userId: actorId,
            senderId: actorId,
            completedBy: actorId,
            completedAt,
            boardId: task.board_id,
            projectId: task.project_id
        });
    } else {
        eventBus.emit('system_task_updated', {
            taskId: task._id,
            task_id: task._id,
            userId: actorId,
            senderId: actorId,
            boardId: task.board_id,
            projectId: task.project_id
        });
    }

    const taskObj = await appendDeadlineToTaskObject(task, deadline);

    emitBoardEvent(task.board_id, 'taskUpdated', taskObj);

    return taskObj;
};

exports.deleteTask = async (taskId, actorId = null) => {
    const task = await Task.findById(taskId);

    if (!task) {
        throw new AppError('Task not found', 404, 'NOT_FOUND');
    }

    await taskCommentService.deleteAllByTaskId(taskId);
    await taskAttachmentService.deleteAllByTaskId(taskId);
    await TaskDeadline.findOneAndDelete({ task_id: taskId });

    eventBus.emit('task_deleted', {
        task_id: taskId,
        taskId,
        userId: actorId,
        senderId: actorId,
        boardId: task.board_id,
        projectId: task.project_id
    });

    await Column.findByIdAndUpdate(
        task.column_id,
        { $pull: { task_order_ids: taskId } }
    );

    await Task.findByIdAndDelete(taskId);

    emitBoardEvent(task.board_id, 'taskDeleted', taskId);

    return true;
};

exports.moveTask = async (taskId, destColumnId, newOrder, actorId = null) => {
    const task = await Task.findById(taskId);

    if (!task || task.is_deleted) {
        throw new AppError('Task not found', 404, 'NOT_FOUND');
    }

    const sourceColumnId = task.column_id;

    if (sourceColumnId.toString() === destColumnId.toString()) {
        const column = await Column.findById(sourceColumnId);

        if (!column) {
            throw new AppError('Source column not found', 404, 'NOT_FOUND');
        }

        column.task_order_ids = column.task_order_ids.filter(
            id => id.toString() !== taskId.toString()
        );

        column.task_order_ids.splice(Number(newOrder) || 0, 0, taskId);

        await column.save();
    } else {
        const [sourceCol, destCol] = await Promise.all([
            Column.findById(sourceColumnId),
            Column.findById(destColumnId)
        ]);

        if (!sourceCol || !destCol) {
            throw new AppError('Column not found', 404, 'NOT_FOUND');
        }

        sourceCol.task_order_ids = sourceCol.task_order_ids.filter(
            id => id.toString() !== taskId.toString()
        );

        destCol.task_order_ids.splice(Number(newOrder) || 0, 0, taskId);

        task.column_id = destColumnId;

        await Promise.all([
            sourceCol.save(),
            destCol.save(),
            task.save()
        ]);
    }

    eventBus.emit('system_task_moved', {
        taskId: task._id,
        task_id: task._id,
        destColumnId,
        dest_column_id: destColumnId,
        userId: actorId,
        senderId: actorId,
        boardId: task.board_id,
        projectId: task.project_id
    });

    emitBoardEvent(task.board_id, 'taskMoved', {
        taskId: task._id,
        destColumnId,
        newOrder
    });

    return task;
};

exports.getMyTasks = async (userId) => {
    const tasks = await Task.find({
        $or: [
            { assignee_id: userId },
            { assignees_user_id: userId }
        ],
        is_deleted: false
    })
        .populate('board_id', 'name')
        .populate('column_id', 'name list_name title')
        .sort({ created_at: -1 })
        .lean();

    for (const task of tasks) {
        const deadline = await TaskDeadline.findOne({ task_id: task._id }).lean();

        if (deadline) {
            task.start_date = deadline.start_date;
            task.due_date = deadline.due_date;
            task.deadline_info = deadline;
        }
    }

    return tasks;
};