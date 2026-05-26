const Column = require('../models/column.model');
const Board = require('../../board/models/board.model'); // Cần import Board để update array
const AppError = require('../../../common/exceptions/AppError');
const Task = require('../../task/models/task.model');

exports.createColumn = async (boardId, name) => {
    const board = await Board.findById(boardId);
    if (!board) throw new AppError('Board not found', 404, 'NOT_FOUND');

    const newColumn = await Column.create({ board_id: boardId, name, task_order_ids: [] });

    // Push ID cột mới vào mảng column_order_ids của Board
    board.column_order_ids.push(newColumn._id);
    await board.save();

    return newColumn;
};

// 🚀 THÊM HÀM SỬA TÊN CỘT
exports.updateColumn = async (columnId, name) => {
    const updatedCol = await Column.findByIdAndUpdate(
        columnId,
        { name },
        { new: true } // Trả về data sau khi update
    );
    if (!updatedCol) throw new AppError('Column not found', 404, 'NOT_FOUND');
    return updatedCol;
};

// 🚀 THÊM HÀM XÓA CỘT AN TOÀN (SOFT DELETE HOẶC HARD DELETE)
exports.deleteColumn = async (columnId) => {
    const column = await Column.findById(columnId);
    if (!column) throw new AppError('Column not found', 404, 'NOT_FOUND');

    // 1. Gỡ ID của cột này ra khỏi Board
    await Board.findByIdAndUpdate(column.board_id, {
        $pull: { column_order_ids: columnId }
    });

    // 2. Cập nhật is_deleted cho cột
    column.is_deleted = true;
    await column.save();

    // 3. (Tùy chọn) Xóa hoặc gắn nhãn is_deleted cho tất cả Task trong cột này
    await Task.updateMany(
        { column_id: columnId },
        { $set: { is_deleted: true } }
    );

    return true;
};