const { GoogleGenerativeAI } = require('@google/generative-ai');
const AppError = require('../../../common/exceptions/AppError');
const AiContext = require('../models/aiContext.model');
const TaskDeadline = require('../../deadline/models/taskDeadline.model');
const Activity = require('../../activity/models/activity.model');
const Task = require('../../task/models/task.model');
const Comment = require('../../task/models/comment.model');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const flashModel = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" }
}); 

const proModel = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" }
});

// Tiện ích bóc tách mã markdown sinh ra từ Gemini trước khi parse JSON
const parseGeminiJson = (textResponse) => {
    const cleanedText = textResponse.replace(/```(json)?|```/gi, '').trim();
    return JSON.parse(cleanedText);
};

exports.generateBoardContext = async (userId, promptText) => {
    try {
        const systemPrompt = `You are a Project Management AI Assistant. Based on the user prompt, generate a structured project board.
        If the user prompt mentions detailed steps or complex tasks, generate an array of subtasks for those specific tasks. Otherwise, leave subtasks empty.
        JSON Structure Requirement:
        {
          "tasks": [
            {
              "title": "string",
              "description": "string",
              "priority": "HIGH" | "MEDIUM" | "LOW",
              "column_name": "string (e.g., To Do, In Progress, Done)",
              "subtasks": ["string", "string"] 
            }
          ]
        }
        User Prompt: ${promptText}`;

        const result = await flashModel.generateContent(systemPrompt);
        const parsedData = parseGeminiJson(result.response.text());
        
        await AiContext.create({ user_id: userId, prompt_text: promptText, context_type: 'GENERATE_BOARD', status: 'SUCCESS' });
        
        return parsedData;
    } catch (error) {
        console.error("Gemini Board Error:", error);
        await AiContext.create({ user_id: userId, prompt_text: promptText, context_type: 'GENERATE_BOARD', status: 'FAILED' });
        throw new AppError('AI Generation failed', 500, 'AI_ERROR');
    }
};

exports.generateInsights = async (userId, projectId) => {
    try {
        const [projectDeadlines, recentActivities] = await Promise.all([
            TaskDeadline.find({ project_id: projectId }).lean(),
            Activity.find({ project_id: projectId }).sort({ created_at: -1 }).limit(50).lean()
        ]);

        const projectContextData = {
            total_deadlines: projectDeadlines.length,
            overdue_tasks: projectDeadlines.filter(d => d.is_overdue || d.status === 'OVERDUE').length,
            extensions_requested: projectDeadlines.reduce((sum, d) => sum + (d.extension_count || 0), 0),
            recent_events: recentActivities
        };

        const systemPrompt = `You are an AI Agile Coach. Analyze the provided project data.
        Data to analyze: ${JSON.stringify(projectContextData)}
        JSON Structure Requirement:
        {
          "risk_level": "HIGH" | "MEDIUM" | "LOW",
          "root_causes": ["string (Reason 1)", "string (Reason 2)"],
          "recommendations": ["string (Action 1)", "string (Action 2)"]
        }`;

        const result = await proModel.generateContent(systemPrompt);
        const parsedData = parseGeminiJson(result.response.text());
        
        await AiContext.create({ user_id: userId, prompt_text: `Analyze project ${projectId}`, context_type: 'GENERATE_INSIGHTS', status: 'SUCCESS' });
        
        return parsedData;
    } catch (error) {
        console.error("Gemini Insight Error:", error);
        await AiContext.create({ user_id: userId, prompt_text: `Analyze project ${projectId}`, context_type: 'GENERATE_INSIGHTS', status: 'FAILED' });
        throw new AppError('AI Insight generation failed', 500, 'AI_ERROR');
    }
};

exports.generateSubtasks = async (userId, title, description) => {
    try {
        const systemPrompt = `You are an AI Task Breakdown Specialist. Break down the following task into a checklist of small, actionable subtasks.
        Task Title: ${title}
        Task Description: ${description || 'No description provided.'}
        
        JSON Structure Requirement:
        {
          "subtasks": ["Actionable step 1", "Actionable step 2", "Actionable step 3"]
        }`;

        const result = await flashModel.generateContent(systemPrompt);
        const parsedData = parseGeminiJson(result.response.text());
        
        await AiContext.create({ user_id: userId, prompt_text: title, context_type: 'GENERATE_SUBTASKS', status: 'SUCCESS' });
        
        return parsedData.subtasks || [];
    } catch (error) {
        console.error("Gemini Subtask Error:", error);
        await AiContext.create({ user_id: userId, prompt_text: title, context_type: 'GENERATE_SUBTASKS', status: 'FAILED' });
        throw new AppError('AI Subtask generation failed', 500, 'AI_ERROR');
    }
};

exports.summarizeTaskActivity = async (userId, taskId) => {
    try {
        const [task, comments, activities] = await Promise.all([
            Task.findById(taskId).lean(),
            Comment.find({ task_id: taskId }).populate('user_id', 'full_name').lean(),
            Activity.find({ target_id: taskId, target_type: 'Task' }).sort({ created_at: -1 }).limit(30).lean()
        ]);

        if (!task) throw new AppError('Task not found', 404, 'NOT_FOUND');

        const contextData = {
            task_title: task.title,
            status: task.is_done ? "Completed" : "In Progress",
            comments: comments.map(c => `${c.user_id?.full_name || 'User'}: ${c.content}`),
            history: activities.map(a => `${a.action}: ${a.details?.message || ''}`)
        };

        const systemPrompt = `You are a Project Manager AI. Summarize the history and discussion of the following task to give a quick overview for a manager.
        Data: ${JSON.stringify(contextData)}
        
        JSON Structure Requirement:
        {
          "summary": "A cohesive paragraph summarizing the progress, blockers, and main discussion points.",
          "key_decisions": ["Decision 1", "Decision 2"],
          "current_status": "Brief status text"
        }`;

        const result = await proModel.generateContent(systemPrompt);
        const parsedData = parseGeminiJson(result.response.text());
        
        await AiContext.create({ user_id: userId, prompt_text: `Summarize task ${taskId}`, context_type: 'SUMMARIZE_ACTIVITY', status: 'SUCCESS' });
        
        return parsedData;
    } catch (error) {
        console.error("Gemini Summarize Error:", error);
        await AiContext.create({ user_id: userId, prompt_text: `Summarize task ${taskId}`, context_type: 'SUMMARIZE_ACTIVITY', status: 'FAILED' });
        throw new AppError('AI Summarization failed', 500, 'AI_ERROR');
    }
};