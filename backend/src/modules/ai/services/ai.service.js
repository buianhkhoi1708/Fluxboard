const { GoogleGenerativeAI } = require('@google/generative-ai');
const AppError = require('../../../common/exceptions/AppError');
const AiContext = require('../models/aiContext.model');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

exports.generateBoardContext = async (userId, promptText) => {
    try {
        const systemPrompt = `You are a Project Management AI Assistant. Based on the user prompt, generate a structured project board.
        CRITICAL RULE: Return ONLY a valid JSON string. Do NOT wrap it in markdown block quotes (like \`\`\`json). Do NOT add explanatory text.
        JSON Structure Requirement:
        {
          "name": "string (Project Name)",
          "description": "string (Brief description)",
          "columns": [
            {
              "name": "string (e.g., To Do, In Progress, Done)",
              "order": number,
              "tasks": [
                {
                  "title": "string",
                  "description": "string",
                  "priority": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
                  "estimated_days": number
                }
              ]
            }
          ]
        }`;

        const result = await model.generateContent([systemPrompt, promptText]);
        let textResponse = result.response.text();
        textResponse = textResponse.replace(/```json/gi, '').replace(/```/gi, '').trim();
        
        // Lưu lịch sử thành công
        await AiContext.create({ user_id: userId, prompt_text: promptText, context_type: 'GENERATE_BOARD', status: 'SUCCESS' });
        
        return JSON.parse(textResponse);
    } catch (error) {
        console.error("Gemini API Error:", error);
        // Lưu lịch sử thất bại
        await AiContext.create({ user_id: userId, prompt_text: promptText, context_type: 'GENERATE_BOARD', status: 'FAILED' });
        throw new AppError('AI processing failed or returned invalid format', 500, 'AI_GENERATION_FAILED');
    }
};

exports.generateInsights = async (userId, projectDataText) => {
    try {
        const systemPrompt = `You are an AI Agile Coach. Analyze the provided project data (completed tasks vs estimated, current bottlenecks).
        CRITICAL RULE: Return ONLY a valid JSON string. Do NOT wrap it in markdown block quotes (like \`\`\`json). Do NOT add explanatory text.
        Structure:
        {
          "overall_health": "string",
          "bottlenecks": ["string"],
          "recommendations": ["string"],
          "velocity_trend": "IMPROVING" | "STABLE" | "DECLINING"
        }`;

        const result = await model.generateContent([systemPrompt, projectDataText]);
        let textResponse = result.response.text();
        textResponse = textResponse.replace(/```json/gi, '').replace(/```/gi, '').trim();
        
        await AiContext.create({ user_id: userId, prompt_text: projectDataText, context_type: 'GENERATE_INSIGHTS', status: 'SUCCESS' });
        return JSON.parse(textResponse);
    } catch (error) {
        await AiContext.create({ user_id: userId, prompt_text: projectDataText, context_type: 'GENERATE_INSIGHTS', status: 'FAILED' });
        throw new AppError('AI Insight generation failed', 500, 'AI_ERROR');
    }
};