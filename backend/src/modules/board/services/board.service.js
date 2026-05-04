const Board = require('../models/board.model');
const Column = require('../models/column.model');
const AppError = require('../../../common/exceptions/AppError');

// 1. CREATE BOARD (Auto-generate 3 default columns)
exports.createBoard = async (project_id, name, description) => {
    const board = await Board.create({ project_id, name, description, column_order_ids: [] });
    
    const defaultColumns = [
        { name: 'To Do', board_id: board._id },
        { name: 'Doing', board_id: board._id },
        { name: 'Done', board_id: board._id }
    ];
    const createdColumns = await Column.insertMany(defaultColumns);

    board.column_order_ids = createdColumns.map(col => col._id);
    await board.save();

    return board;
};

// 2. CREATE A SINGLE COLUMN
exports.createColumn = async (boardId, name) => {
    const board = await Board.findById(boardId);
    if (!board) throw new AppError('Board not found', 404, 'NOT_FOUND');

    const newColumn = await Column.create({ board_id: boardId, name, task_order_ids: [] });

    board.column_order_ids.push(newColumn._id);
    await board.save();

    return newColumn;
};

// 3. GET BOARD DETAILS
exports.getBoardDetail = async (boardId) => {
    const board = await Board.findById(boardId)
        .populate({
            path: 'column_order_ids',
      })
        .lean();

    if (!board) throw new AppError('Board not found', 404, 'NOT_FOUND');

    return board;
};