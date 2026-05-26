const columnService = require('../services/column.service');
const Task = require('../../task/models/task.model');

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

// 🚀 THÊM HÀM UPDATE
exports.updateColumn = async (req, res, next) => {
    try {
        const { id } = req.params; // Lấy ID từ URL
        const { name } = req.body;
        
        const updatedColumn = await columnService.updateColumn(id, name);
        res.status(200).json({ success: true, data: updatedColumn });
    } catch (error) {
        next(error);
    }
};

// 🚀 THÊM HÀM DELETE
exports.deleteColumn = async (req, res, next) => {
    try {
        const { id } = req.params;
        await columnService.deleteColumn(id);
        res.status(200).json({ success: true, message: 'Deleted successfully' });
    } catch (error) {
        next(error);
    }
};