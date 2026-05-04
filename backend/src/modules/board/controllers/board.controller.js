const boardService = require('../services/board.service');

exports.createBoard = async (req, res, next) => {
    try {
        const { project_id, name, description } = req.body;
        const board = await boardService.createBoard(project_id, name, description);
        res.status(201).json({ 
            success: true, 
            data: board, 
            message: 'Board created successfully' 
        });
    } catch (error) { next(error); }
};

exports.createColumn = async (req, res, next) => {
    try {
        const { board_id, name } = req.body;
        const column = await boardService.createColumn(board_id, name);
        res.status(201).json({ 
            success: true, 
            data: column, 
            message: 'Column created successfully' 
        });
    } catch (error) { next(error); }
};

exports.getBoardDetail = async (req, res, next) => {
    try {
        const board = await boardService.getBoardDetail(req.params.id);
        res.status(200).json({ 
            success: true, 
            data: board 
        });
    } catch (error) { next(error); }
};