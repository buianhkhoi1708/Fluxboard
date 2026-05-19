const Board = require('../models/board.model');
const Column = require('../../column/models/column.model'); 
const Task = require('../../task/models/task.model');
const AppError = require('../../../common/exceptions/AppError');
const taskCoreService = require('../../task/services/taskCore.service');

exports.createBoard = async (project_id, name, description) => {
    const board = await Board.create({ project_id, name, description, column_order_ids: [] });
    
    const defaultColumns = [
        { name: 'To Do', board_id: board._id, task_order_ids: [] },
        { name: 'Doing', board_id: board._id, task_order_ids: [] },
        { name: 'Done', board_id: board._id, task_order_ids: [] }
    ];
    const createdColumns = await Column.insertMany(defaultColumns);

    board.column_order_ids = createdColumns.map(col => col._id);
    await board.save();

    return board;
};

exports.getBoardDetail = async (boardId) => {
    const board = await Board.findById(boardId)
        .populate({
            path: 'column_order_ids',
            populate: {
                path: 'task_order_ids', 
                model: 'Task'
            }
        }).lean();
        
    if (!board) throw new AppError('Board not found', 404, 'NOT_FOUND');
    return board;
};

exports.deleteBoard = async (boardId) => {
    const board = await Board.findByIdAndUpdate(boardId, { is_deleted: true }, { new: true });
    if (!board) throw new AppError('Board not found', 404, 'NOT_FOUND');

    await Column.updateMany({ board_id: boardId }, { $set: { is_deleted: true } });

    const tasks = await Task.find({ board_id: boardId }).select('_id').lean();
    for (const t of tasks) {
        await taskCoreService.deleteTask(t._id);
    }
    
    return true;
};