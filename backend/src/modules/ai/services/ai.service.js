const { GoogleGenerativeAI } = require('@google/generative-ai');
const AppError = require('../../../common/exceptions/AppError');
const AiContext = require('../models/aiContext.model');

// 💡 Tự động thu thập dữ liệu (Context) theo yêu cầu Đợt 4
const TaskDeadline = require('../../deadline/models/taskDeadline.model');
const Activity = require('../../activity/models/activity.model');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const flashModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Dùng cho Task Generation (Nhanh)
const proModel = genAI.getGenerativeModel({ model: "gemini-1.5-pro" }); // Dùng cho Insight Analysis (Phân tích sâu)

exports.generateBoardContext = async (userId, promptText) => {
    try {
        const systemPrompt = `You are a Project Management AI Assistant. Based on the user prompt, generate a structured project board.
        CRITICAL RULE: Return ONLY a valid JSON string. Do NOT wrap it in markdown block quotes (like \`\`\`json). Do NOT add explanatory text.
        JSON Structure Requirement (AiTaskResponse schema):
        {
          "tasks": [
            {
              "title": "string",
              "description": "string",
              "priority": "HIGH" | "MEDIUM" | "LOW",
              "column_name": "string (e.g., To Do, In Progress, Done)"
            }
          ]
        }`;

        const result = await flashModel.generateContent([systemPrompt, promptText]);
        let textResponse = result.response.text();
        textResponse = textResponse.replace(/```json/gi, '').replace(/```/gi, '').trim();
        
        await AiContext.create({ user_id: userId, prompt_text: promptText, context_type: 'GENERATE_BOARD', status: 'SUCCESS' });
        
        return JSON.parse(textResponse);
    } catch (error) {
        console.error("Gemini API Error:", error);
        await AiContext.create({ user_id: userId, prompt_text: promptText, context_type: 'GENERATE_BOARD', status: 'FAILED' });
        throw new AppError('AI processing failed or returned invalid format', 500, 'AI_GENERATION_FAILED');
    }
};

exports.generateInsights = async (userId, projectId) => {
    try {
        // 1. Tự động thu thập dữ liệu thực tế từ Database thay vì chờ Frontend gửi
        const deadlines = await TaskDeadline.find({ is_deleted: false })
            .populate({ path: 'task_id', match: { project_id: projectId }, select: 'title priority is_done' })
            .lean();
        
        const projectDeadlines = deadlines.filter(d => d.task_id); 
        
        const recentActivities = await Activity.find({ project_id: projectId })
            .sort({ created_at: -1 })
            .limit(20)
            .select('action message created_at')
            .lean();

        // 2. Đóng gói Context để nạp vào LLM
        const projectContextData = {
            total_tasks: projectDeadlines.length,
            overdue_tasks: projectDeadlines.filter(d => d.is_overdue || d.status === 'OVERDUE').length,
            extensions_requested: projectDeadlines.reduce((sum, d) => sum + (d.extension_count || 0), 0),
            recent_events: recentActivities
        };

        const systemPrompt = `You are an AI Agile Coach. Analyze the provided project data regarding deadlines and recent team activities.
        CRITICAL RULE: Return ONLY a valid JSON string. Do NOT wrap it in markdown block quotes (like \`\`\`json). Do NOT add explanatory text.
        Data to analyze: ${JSON.stringify(projectContextData)}
        
        JSON Structure Requirement (AiInsightResponse schema):
        {
          "risk_level": "HIGH" | "MEDIUM" | "LOW",
          "root_causes": ["string (Reason 1)", "string (Reason 2)"],
          "recommendations": ["string (Action 1)", "string (Action 2)"]
        }`;

        const result = await proModel.generateContent(systemPrompt);
        let textResponse = result.response.text();
        textResponse = textResponse.replace(/```json/gi, '').replace(/```/gi, '').trim();
        
        await AiContext.create({ user_id: userId, prompt_text: `Analyze project ${projectId}`, context_type: 'GENERATE_INSIGHTS', status: 'SUCCESS' });
        
        return JSON.parse(textResponse);
    } catch (error) {
        console.error("Gemini Insight Error:", error);
        await AiContext.create({ user_id: userId, prompt_text: `Analyze project ${projectId}`, context_type: 'GENERATE_INSIGHTS', status: 'FAILED' });
        throw new AppError('AI Insight generation failed', 500, 'AI_ERROR');
    }
};