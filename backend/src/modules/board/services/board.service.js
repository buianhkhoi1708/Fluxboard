const Board = require('../models/board.model');
const Column = require('../models/column.model');
const Task = require('../models/task.model');
const AppError = require('../../../common/exceptions/AppError');

exports.createBoard = async (project_id, name, description) => {
    const board = await Board.create({ project_id, name, description });
    
    const defaultColumns = [
        { name: 'To Do', board_id: board._id, order: 0 },
        { name: 'Doing', board_id: board._id, order: 1 },
        { name: 'Done', board_id: board._id, order: 2 }
    ];
    await Column.insertMany(defaultColumns);
    return board;
};

exports.getBoardDetail = async (boardId) => {
    const board = await Board.findById(boardId).lean();
    if (!board) throw new AppError('Board not found', 404, 'NOT_FOUND');

    const [columns, tasks] = await Promise.all([
        Column.find({ board_id: boardId }).sort({ order: 1 }).lean(),
        Task.find({ board_id: boardId }).sort({ order: 1 }).lean()
    ]);

    const columnMap = columns.reduce((acc, col) => {
        acc[col._id] = { list_name: col.name, order: col.order, _id: col._id, cards: [] };
        return acc;
    }, {});

    tasks.forEach(task => {
        if (columnMap[task.column_id]) {
            columnMap[task.column_id].cards.push(task);
        }
    });

    board.lists = Object.values(columnMap);
    return board;
};