const Board = require('../models/board.model');
const Column = require('../../column/models/column.model'); 
const Task = require('../../task/models/task.model');
const TaskDeadline = require('../../deadline/models/taskDeadline.model'); // 🚀 Import bảng Deadline
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
    // 1. Dùng Deep Populate để lấy Task + Deadline cùng lúc
    const board = await Board.findById(boardId)
        .populate({
            path: 'column_order_ids',
            populate: {
                path: 'task_order_ids', 
                model: 'Task',
                populate: {
                    path: 'deadline_info', // 🚀 Kéo dữ liệu từ bảng TaskDeadline qua field ảo
                    model: 'TaskDeadline'
                }
            }
        })
        .lean({ virtuals: true }); // 🚀 BẮT BUỘC CÓ: Ép Mongoose giữ lại field ảo (virtual) khi dùng lean()
        
    if (!board) throw new AppError('Board not found', 404, 'NOT_FOUND');

    // 2. 🚀 BƠM NGÀY THÁNG RA NGOÀI ĐỂ FRONTEND ĐỌC ĐƯỢC NGAY
    if (board.column_order_ids && Array.isArray(board.column_order_ids)) {
        board.column_order_ids.forEach(column => {
            if (column.task_order_ids && Array.isArray(column.task_order_ids)) {
                column.task_order_ids = column.task_order_ids.map(task => {
                    return {
                        ...task,
                        // Kéo ngày từ deadline_info ra ngoài root
                        start_date: task.deadline_info?.start_date || null,
                        due_date: task.deadline_info?.due_date || null,
                        
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