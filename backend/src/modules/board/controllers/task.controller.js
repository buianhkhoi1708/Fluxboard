const taskService = require('../services/task.service');

exports.createTask = async (req, res, next) => {
    try {
        const task = await taskService.createTask(req.body);
        res.status(201).json({ success: true, data: task, message: 'Task created successfully' });
    } catch (error) { next(error); }
};

exports.updateTask = async (req, res, next) => {
    try {
        const task = await taskService.updateTask(req.params.id, req.body);
        res.status(200).json({ success: true, data: task, message: 'Task updated successfully' });
    } catch (error) { next(error); }
};

exports.deleteTask = async (req, res, next) => {
    try {
        await taskService.deleteTask(req.params.id);
        res.status(200).json({ success: true, message: 'Task deleted successfully' });
    } catch (error) { next(error); }
};

exports.moveTask = async (req, res, next) => {
    try {
        const { destColumnId, newOrder } = req.body;
        await taskService.moveTask(req.params.id, destColumnId, newOrder);
        res.status(200).json({ success: true, message: 'Task moved successfully' });
    } catch (error) { next(error); }
};

// ==========================================
// QUẢN LÝ CHECKLIST (SUBTASKS)
// ==========================================

exports.addSubtask = async (req, res, next) => {
    try {
        const { title } = req.body;
        const task = await taskService.addSubtask(req.params.id, title);
        res.status(201).json({ success: true, data: task, message: 'Subtask added successfully' });
    } catch (error) { next(error); }
};

exports.updateSubtask = async (req, res, next) => {
    try {
        const task = await taskService.updateSubtask(req.params.id, req.params.subtaskId, req.body);
        res.status(200).json({ success: true, data: task, message: 'Subtask updated successfully' });
    } catch (error) { next(error); }
};

exports.deleteSubtask = async (req, res, next) => {
    try {
        const task = await taskService.deleteSubtask(req.params.id, req.params.subtaskId);
        res.status(200).json({ success: true, data: task, message: 'Subtask deleted successfully' });
    } catch (error) { next(error); }
};