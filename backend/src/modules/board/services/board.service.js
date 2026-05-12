const Board = require('../models/board.model');
const Column = require('../../column/models/column.model'); // Trỏ sang nhà mới của Column
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

// 2. GET BOARD DETAIL
exports.getBoardDetail = async (boardId) => {
    // (Mình viết lại hàm getBoardDetail chuẩn vì file của bạn bị cắt ngang ở đoạn này)
    const board = await Board.findById(boardId).lean();
    if (!board) throw new AppError('Board not found', 404, 'NOT_FOUND');
    
    return board;
};