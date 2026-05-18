const columnService = require('../services/column.service');

exports.createColumn = async (req, res, next) => {
    try {
        const { board_id, name } = req.body;
        const column = await columnService.createColumn(board_id, name);
        res.status(201).json({ 
            success: true, 
            data: column, 
            message: 'Column created successfully' 
        });
    } catch (error) { next(error); }
};