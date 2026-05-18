const Column = require('../models/column.model');
const Board = require('../../board/models/board.model'); // Cần import Board để update array
const AppError = require('../../../common/exceptions/AppError');

exports.createColumn = async (boardId, name) => {
    const board = await Board.findById(boardId);
    if (!board) throw new AppError('Board not found', 404, 'NOT_FOUND');

    const newColumn = await Column.create({ board_id: boardId, name, task_order_ids: [] });

    // Push ID cột mới vào mảng column_order_ids của Board
    board.column_order_ids.push(newColumn._id);
    await board.save();

    return newColumn;
};