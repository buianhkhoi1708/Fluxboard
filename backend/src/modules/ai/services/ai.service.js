const { GoogleGenerativeAI } = require('@google/generative-ai');
const AppError = require('../../../common/exceptions/AppError');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

exports.generateBoardContext = async (promptText) => {
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
        
        return JSON.parse(textResponse);
    } catch (error) {
        console.error("Gemini API Error:", error);
        throw new AppError('AI processing failed or returned invalid format', 500, 'AI_GENERATION_FAILED');
    }
};