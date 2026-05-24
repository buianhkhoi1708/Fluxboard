const Board = require('../models/board.model');
const Column = require('../../column/models/column.model'); 
const Task = require('../../task/models/task.model');
const TaskDeadline = require('../../deadline/models/taskDeadline.model'); // 🚀 Import bảng Deadline
const AppError = require('../../../common/exceptions/AppError');
const taskCoreService = require('../../task/services/taskCore.service');

exports.createBoard = async (project_id, name, description, createDefaultCols = true) => {
    const board = await Board.create({ project_id, name, description, column_order_ids: [] });
    
    // 🚀 CHỈ TẠO 3 CỘT MẶC ĐỊNH NẾU ĐƯỢC CHO PHÉP
    if (createDefaultCols !== false) {
        const defaultColumns = [
            { name: 'To Do', board_id: board._id, task_order_ids: [] },
            { name: 'Doing', board_id: board._id, task_order_ids: [] },
            { name: 'Done', board_id: board._id, task_order_ids: [] }
        ];
        const createdColumns = await Column.insertMany(defaultColumns);

        board.column_order_ids = createdColumns.map(col => col._id);
        await board.save();
    }

    return board;
};

exports.getBoardDetail = async (boardId) => {
    // 1. Dùng Deep Populate để lấy Task + Deadline + User (Bắt buộc để UI không crash)
    const board = await Board.findById(boardId)
        .populate({
            path: 'column_order_ids',
            match: { is_deleted: { $ne: true } }, // 🚀 Bỏ qua cột rác
            populate: {
                path: 'task_order_ids', 
                model: 'Task',
                match: { is_deleted: { $ne: true } }, // 🚀 Bỏ qua task rác
                populate: [
                    {
                        path: 'deadline_info', 
                        model: 'TaskDeadline'
                    },
                    {
                        // 🚀 THÊM CÁI NÀY ĐỂ FRONTEND CÓ AVATAR VÀ TÊN MÀ VẼ
                        path: 'assignees_user_id',
                        model: 'User',
                        select: 'full_name email avatar'
                    }
                ]
            }
        })
        .lean({ virtuals: true }); 
        
    if (!board) throw new AppError('Board not found', 404, 'NOT_FOUND');

    // 2. 🚀 BƠM VÀ MAP DỮ LIỆU AN TOÀN (CHỐNG CRASH REACT)
    if (board.column_order_ids && Array.isArray(board.column_order_ids)) {
        // Lọc cột null lỡ như bị xóa
        board.column_order_ids = board.column_order_ids.filter(col => col != null);
        
        board.column_order_ids.forEach(column => {
            if (column.task_order_ids && Array.isArray(column.task_order_ids)) {
                // Lọc bỏ task null TRƯỚC KHI map để tránh lỗi Cannot read properties of null
                column.task_order_ids = column.task_order_ids
                    .filter(task => task != null)
                    .map(task => {
                        return {
                            ...task,
                            // 🚀 THÔNG MINH HƠN: Ưu tiên lấy từ deadline_info, nếu không có thì lấy trực tiếp từ Task (do AI gen)
                            start_date: task.deadline_info?.start_date || task.start_date || null,
                            due_date: task.deadline_info?.due_date || task.due_date || null,
                            
                            // Đảm bảo các trường mảng và số liệu không bị undefined
                            assignees_user_id: task.assignees_user_id || [],
                            story_point: task.story_point || 0
                        };
                    });
            }
        });
    }

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

exports.updateBoard = async (boardId, updateData) => {
    // Cập nhật thông tin bảng (vd: đổi tên, đổi status)
    const board = await Board.findByIdAndUpdate(
        boardId, 
        updateData, 
        { new: true }
    );
    if (!board) throw new AppError('Board not found', 404, 'NOT_FOUND');
    return board;
};

exports.deleteBoard = async (boardId) => {
    // 1. Soft delete Bảng
    const board = await Board.findByIdAndUpdate(boardId, { is_deleted: true }, { new: true });
    if (!board) throw new AppError('Board not found', 404, 'NOT_FOUND');

    // 2. Soft delete các Cột thuộc Bảng này
    await Column.updateMany({ board_id: boardId }, { $set: { is_deleted: true } });

    // 3. Gọi Task Service để xóa Task (hoặc update is_deleted)
    const tasks = await Task.find({ board_id: boardId }).select('_id').lean();
    for (const t of tasks) {
        await taskCoreService.deleteTask(t._id);
    }
    
    return true;
};