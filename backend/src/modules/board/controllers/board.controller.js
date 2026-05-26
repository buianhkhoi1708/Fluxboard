const boardService = require('../services/board.service');

exports.createBoard = async (req, res, next) => {
    try {
        const {
            project_id,
            projectId,
            name,
            description,
            create_default_cols,
        } = req.body;

        const newBoard = await boardService.createBoard(
            project_id || projectId,
            name,
            description,
            create_default_cols,
        );

        res.status(201).json({
            success: true,
            data: newBoard,
        });
    } catch (error) {
        next(error);
    }
};

exports.getBoardDetail = async (req, res, next) => {
    try {
        const board = await boardService.getBoardDetail(
            req.params.id,
            req.user,
        );

        res.status(200).json({
            success: true,
            data: board,
        });
    } catch (error) {
        next(error);
    }
};

exports.updateBoard = async (req, res, next) => {
    try {
        const updatedBoard = await boardService.updateBoard(
            req.params.id,
            req.body,
        );

        res.status(200).json({
            success: true,
            data: updatedBoard,
        });
    } catch (error) {
        next(error);
    }
};

exports.deleteBoard = async (req, res, next) => {
    try {
        await boardService.deleteBoard(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Xóa bảng thành công',
        });
    } catch (error) {
        next(error);
    }
};