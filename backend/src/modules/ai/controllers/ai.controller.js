const aiService = require('../services/ai.service');

exports.generateBoard = async (req, res, next) => {
    try {
        const { prompt } = req.body;
        if (!prompt) {
            return res.status(400).json({ success: false, error: { message: 'Prompt is required' }});
        }

        const generatedData = await aiService.generateBoardContext(req.user.id, prompt);
        
        res.status(200).json({ success: true, data: generatedData });
    } catch (error) { next(error); }
};

exports.generateInsights = async (req, res, next) => {
    try {
        const projectId = req.body.projectId || req.params.projectId;
        if (!projectId) {
            return res.status(400).json({ success: false, error: { message: 'Project ID is required' }});
        }

        const insights = await aiService.generateInsights(req.user.id, projectId);
        res.status(200).json({ success: true, data: insights });
    } catch (error) { next(error); }
};

exports.generateSubtasks = async (req, res, next) => {
    try {
        const { title, description } = req.body;
        if (!title) {
            return res.status(400).json({ success: false, error: { message: 'Task title is required' }});
        }

        const subtasks = await aiService.generateSubtasks(req.user.id, title, description);
        res.status(200).json({ success: true, data: subtasks });
    } catch (error) { next(error); }
};

exports.summarizeTaskActivity = async (req, res, next) => {
    try {
        const taskId = req.params.taskId;
        const summary = await aiService.summarizeTaskActivity(req.user.id, taskId);
        res.status(200).json({ success: true, data: summary });
    } catch (error) { next(error); }
};