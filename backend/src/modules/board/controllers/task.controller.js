const taskService = require('../services/task.service');

exports.createTask = async (req, res, next) => {
    try {
        const task = await taskService.createTask(req.body);
        res.status(201).json({ success: true, data: task });
    } catch (error) { next(error); }
};

exports.moveTask = async (req, res, next) => {
    try {
        const { sourceColumnId, destColumnId, sourceIndex, destIndex } = req.body;
        await taskService.moveTask(req.params.id, sourceColumnId, destColumnId, sourceIndex, destIndex);
        res.status(200).json({ success: true, message: 'Task moved successfully' });
    } catch (error) { next(error); }
};