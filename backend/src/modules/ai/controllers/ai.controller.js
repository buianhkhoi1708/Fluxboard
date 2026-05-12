const aiService = require('../services/ai.service');

exports.generateBoard = async (req, res, next) => {
    try {
        const { prompt } = req.body;
        if (!prompt) {
            return res.status(400).json({ success: false, error: { message: 'Prompt is required' }});
        }

        // Truyền thêm req.user.id để lưu vào AiContext (Lịch sử sử dụng AI)
        const generatedData = await aiService.generateBoardContext(req.user.id, prompt);
        
        res.status(200).json({
            success: true,
            data: generatedData
        });
    } catch (error) {
        next(error);
    }
};

exports.generateInsights = async (req, res, next) => {
    try {
        const { projectData } = req.body;
        if (!projectData) {
            return res.status(400).json({ success: false, error: { message: 'Project data is required' }});
        }

        // Truyền thêm req.user.id để lưu vào AiContext
        const insights = await aiService.generateInsights(req.user.id, projectData);
        
        res.status(200).json({
            success: true,
            data: insights
        });
    } catch (error) {
        next(error);
    }
};