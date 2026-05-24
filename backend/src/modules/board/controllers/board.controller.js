const boardService = require('../services/board.service');

exports.createBoard = async (req, res, next) => {
    try {
        // 🚀 Bổ sung thêm biến create_default_cols lấy từ body
        const { project_id, name, description, create_default_cols } = req.body;
        
        // Truyền xuống service
        const newBoard = await boardService.createBoard(
            project_id, 
            name, 
            description, 
            create_default_cols // 👈 Cắm vào đây
        );
        
        res.status(201).json({ success: true, data: newBoard });
    } catch (error) {
        next(error);
    }
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

exports.updateBoard = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        const updatedBoard = await boardService.updateBoard(id, updateData);
        res.status(200).json({ success: true, data: updatedBoard });
    } catch (error) {
        next(error);
    }
};

exports.deleteBoard = async (req, res, next) => {
    try {
        const { id } = req.params;
        await boardService.deleteBoard(id);
        res.status(200).json({ success: true, message: 'Xóa bảng thành công' });
    } catch (error) {
        next(error);
    }
};