const Board = require('../models/board.model');
const Column = require('../../column/models/column.model'); 
const AppError = require('../../../common/exceptions/AppError');

exports.createBoard = async (project_id, name, description) => {
    const board = await Board.create({ project_id, name, description, column_order_ids: [] });
    
    // Đảm bảo tạo cột mặc định có sẵn mảng task_order_ids rỗng
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
    // 🚀 THÊM POPULATE Ở ĐÂY ĐỂ FRONTEND CÓ DỮ LIỆU RENDER
    const board = await Board.findById(boardId)
        .populate({
            path: 'column_order_ids',
            populate: {
                path: 'task_order_ids', // Phải populate thêm Task bên trong Column
                model: 'Task'
            }
        })
        .lean();
        
    if (!board) throw new AppError('Board not found', 404, 'NOT_FOUND');
    return board;
};