const aiService = require('../services/ai.service');

exports.generateBoard = async (req, res, next) => {
    try {
        const { prompt } = req.body;
        if (!prompt) {
            return res.status(400).json({ success: false, error: { message: 'Prompt is required' }});
        }

        const generatedData = await aiService.generateBoardContext(prompt);
        
        res.status(200).json({
            success: true,
            data: generatedData
        });
    } catch (error) {
        next(error);
    }
};