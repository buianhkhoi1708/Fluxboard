const { GoogleGenerativeAI } = require('@google/generative-ai');
const AppError = require('../../../common/exceptions/AppError');

// Models
const AiContext = require('../models/aiContext.model');
const TaskDeadline = require('../../deadline/models/taskDeadline.model');
const Activity = require('../../activity/models/activity.model');
const Task = require('../../task/models/task.model');
const Comment = require('../../task/models/comment.model');
const Column = require('../../column/models/column.model');
const User = require('../../user/models/user.model');
const Board = require('../../board/models/board.model');
// Cấu hình Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const flashModel = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: 'application/json' }
});

const proModel = genAI.getGenerativeModel({
    model: 'gemini-2.5-pro', // 🚀 Đã đổi thành bản Pro cho các tác vụ cần phân tích sâu (Insights)
    generationConfig: { responseMimeType: 'application/json' }
});

// 🚀 TỐI ƯU HÓA: Hàm Parse JSON cực mạnh, bọc try-catch và Regex chống rác Markdown
const parseGeminiJson = (textResponse) => {
    // Nếu AI trả về rỗng, quăng lỗi ngay để nó nhảy vào khối catch retry
    if (!textResponse || typeof textResponse !== 'string') {
        throw new Error("AI trả về nội dung rỗng hoặc không phải chuỗi");
    }
    
    const cleanedText = textResponse
        .replace(/```(?:json)?\s*|\s*```/gi, '')
        .trim();
        
    return JSON.parse(cleanedText);
};

/**
 * ========================================================================
 * 1. SMART TASK GENERATION (TẠO TASK THÔNG MINH)
 * ========================================================================
 */
exports.generateSmartTasks = async (
    userId,
    boardId,
    projectId,
    userPrompt,
    memberIds,
    generationMode,
    startDate
) => {
    try {
        // =====================================================
        // 1. ĐỌC DỮ LIỆU BOARD HIỆN TẠI (TỐI ƯU BẰNG .lean())
        // =====================================================
        const existingColumns = await Column.find({
            board_id: boardId,
            is_deleted: { $ne: true }
        }).sort({ order: 1 }).lean();

        const existingColIds = existingColumns.map((c) => c._id.toString());
        const existingTasks = existingColIds.length
            ? await Task.find({
                  column_id: { $in: existingColIds },
                  is_deleted: { $ne: true }
              }).lean()
            : [];

        const currentColsStr = existingColumns.length
            ? existingColumns.map((c) => c.name).join(', ')
            : 'Chưa có cột nào';
        const currentTasksStr = existingTasks.length
            ? existingTasks.map((t) => t.title).join(' | ')
            : 'Chưa có task nào';

        // =====================================================
        // 2. ALIAS USER (ÁNH XẠ BÍ DANH CHỐNG ẢO GIÁC)
        // =====================================================
        const aliasToRealId = {};
        let personnelContextStr = '';

        if (memberIds && memberIds.length > 0) {
            const users = await User.find({ _id: { $in: memberIds } }).lean();
            let index = 1;
            users.forEach((user) => {
                const alias = `MEMBER_${index++}`;
                aliasToRealId[alias] = user._id.toString();
                personnelContextStr += `- ${alias}: ${user.full_name || 'User'} (Vai trò: Kỹ sư/Thực thi)\n`;
            });
        } else {
            personnelContextStr = 'CHƯA_CHỌN_NHÂN_SỰ';
        }

        // =====================================================
        // 3. LOAD AI CONTEXT LỊCH SỬ
        // =====================================================
       let aiContext = await AiContext.findOne({ board_id: boardId, is_deleted: { $ne: true } });
        
        if (!aiContext) {
            aiContext = new AiContext({ 
                board_id: boardId, 
                user_id: userId,               
                context_type: 'GENERATE_BOARD', // 👈 FIX THÀNH CHỮ NÀY LÀ KHỚP 100%
                prompt_text: userPrompt,       
                messages: [] 
            });
        } else {
            aiContext.prompt_text = userPrompt;
        }

        // =====================================================
        // 4. SYSTEM PROMPT (ÉP BUỘC ĐỊNH DẠNG VÀ PHÂN CÔNG)
        // =====================================================
        // 🚀 FIX LỖI CRASH: Bổ sung khai báo modeInstruction bị thiếu
        const modeInstruction = generationMode === 'SIMPLE'
            ? 'MÔ HÌNH: KANBAN ĐƠN GIẢN. Cố gắng sử dụng lại các cột đã có. Nếu chưa có cột nào, hãy đề xuất 3 cột: ["TO DO", "IN PROGRESS", "DONE"].'
            : 'MÔ HÌNH: ĐA GIAI ĐOẠN (MULTI-PHASE). Bạn có thể tái sử dụng cột cũ hoặc đề xuất thêm cột Giai đoạn mới nếu cần thiết.';

        const systemInstruction = `Bạn là một Chuyên gia Quản trị Dự án cấp cao (Master Project Manager).
HIỆN TRẠNG DỰ ÁN ĐANG CÓ:
- Các cột hiện tại: ${currentColsStr}
- Các task ĐÃ TỒN TẠI: ${currentTasksStr}
=> NHIỆM VỤ CỦA BẠN: HÃY ĐỀ XUẤT THÊM CÁC TASK MỚI (KHÔNG TẠO LẠI CÁC TASK ĐÃ TỒN TẠI BÊN TRÊN).

DANH SÁCH NHÂN SỰ ĐỂ GÁN (BÍ DANH):
${personnelContextStr}

CHẾ ĐỘ SINH TASK: ${modeInstruction}

QUY ĐỊNH THỜI GIAN NGHIÊM NGẶT:
- Ngày bắt đầu cho đợt task mới này LÀ: ${startDate || 'Hôm nay'}.
- BẠN BẮT BUỘC PHẢI TỰ ĐỘNG TÍNH TOÁN 'start_date' VÀ 'due_date' CHO TỪNG TASK DỰA TRÊN MỨC ĐỘ PHỨC TẠP VÀ TRÌNH TỰ LOGIC.

QUY ĐỊNH PHÂN CÔNG & ĐÁNH GIÁ (BẮT BUỘC):
1. 'assignee_user_id': BẠN BẮT BUỘC PHẢI PHÂN CÔNG 1 NGƯỜI TỪ DANH SÁCH BÍ DANH CHO MỖI TASK (Ví dụ: "MEMBER_1"). KHÔNG ĐƯỢC ĐỂ TRỐNG HOẶC NULL!
2. 'story_point': BẠN PHẢI ƯỚC LƯỢNG ĐIỂM ĐỘ KHÓ CHO TỪNG TASK (TỪ 1 ĐẾN 21 THEO DÃY FIBONACCI).
3. 'ai_estimation_reason': GIẢI THÍCH NGẮN GỌN (1 CÂU) TẠI SAO BẠN CHO TASK NÀY SỐ 'story_point' ĐÓ.

MẪU JSON TRẢ VỀ (BẮT BUỘC TUÂN THỦ FORMAT):
{
  "suggested_columns": ["Tên cột 1", "Tên cột 2"],
  "tasks": [
    {
      "title": "Tên task",
      "description": "Mô tả",
      "column_name": "Tên cột", 
      "assignee_user_id": "MEMBER_1",
      "story_point": 5,
      "ai_estimation_reason": "Cần nhiều thời gian...",
      "priority": "HIGH",
      "start_date": "2026-05-15",
      "due_date": "2026-05-20",
      "subtasks": [
        {
          "title": "Tên việc con",
          "description": "Chi tiết",
          "assignee_user_id": "MEMBER_2",
          "priority": "HIGH"
        }
      ]
    }
  ]
}`;

        const chatHistory = (aiContext.messages || []).map((msg) => ({
            role: msg.role,
            parts: [{ text: msg.content }]
        }));

        // =====================================================
        // 5. RETRY LOGIC (BẮT LỖI TỰ ĐỘNG SỬA)
        // =====================================================
        const MAX_RETRIES = 3;
        let finalResponse = null;
        let finalCleanedJson = '';
        let lastError = '';

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            const promptToUse = attempt === 1
                ? userPrompt
                : `${userPrompt}\n\n(Lỗi JSON trước đó: ${lastError} -> VUI LÒNG KIỂM TRA LẠI CÚ PHÁP)`;

            try {
                const contents = [...chatHistory, { role: 'user', parts: [{ text: promptToUse }] }];

                const result = await flashModel.generateContent({
                    contents,
                    systemInstruction: { role: 'system', parts: [{ text: systemInstruction }] }
                });

                finalResponse = parseGeminiJson(result.response.text());

                if (!finalResponse.tasks || !finalResponse.tasks.length) {
                    throw new Error('Danh sách task rỗng, AI không sinh được dữ liệu');
                }

                finalCleanedJson = JSON.stringify(finalResponse);
                break; // Thành công thì thoát
            } catch (error) {
                lastError = error.message;
                console.warn(`[AI Retry ${attempt}/${MAX_RETRIES}] Lỗi:`, lastError);

                if (attempt === MAX_RETRIES) {
                    throw new AppError(`AI format error: ${lastError}`, 500, 'AI_FORMAT_ERROR');
                }
            }
        }

        // =====================================================
        // 6. XỬ LÝ CỘT (TÁI SỬ DỤNG HOẶC TẠO MỚI)
        // =====================================================
       const columnNameToIdMap = {};
        let maxOrder = 0;
        const newlyCreatedColIds = []; // 🚀 Lưu lại ID cột mới để cập nhật vào Board

        existingColumns.forEach((column) => {
            columnNameToIdMap[column.name.trim().toLowerCase()] = column._id.toString();
            if (column.order > maxOrder) maxOrder = column.order;
        });

        if (finalResponse.suggested_columns) {
            for (const colName of finalResponse.suggested_columns) {
                const colKey = colName.trim().toLowerCase();
                if (!columnNameToIdMap[colKey]) {
                    maxOrder++;
                    const newColumn = await Column.create({ board_id: boardId, name: colName, order: maxOrder });
                    columnNameToIdMap[colKey] = newColumn._id.toString();
                    newlyCreatedColIds.push(newColumn._id); // 🚀 Thêm vào danh sách cột mới
                }
            }
        }

        // 🚀 CẬP NHẬT BOARD NẾU CÓ CỘT MỚI
        if (newlyCreatedColIds.length > 0) {
            await Board.findByIdAndUpdate(boardId, {
                $push: { column_order_ids: { $each: newlyCreatedColIds } }
            });
        }

        let fallbackColumnId = Object.values(columnNameToIdMap)[0];
        if (!fallbackColumnId) {
            const fallbackColumn = await Column.create({ board_id: boardId, name: 'TO DO', order: 0 });
            fallbackColumnId = fallbackColumn._id.toString();
            columnNameToIdMap['to do'] = fallbackColumnId;
            
            await Board.findByIdAndUpdate(boardId, {
                $push: { column_order_ids: fallbackColumnId }
            });
        }

        // =====================================================
        // 7. BULK INSERT TASKS VÀ SUBTASKS (HIỆU SUẤT CAO)
        // =====================================================
       let taskOrder = existingTasks.length;
        const tasksToSave = [];

        for (const dto of finalResponse.tasks) {
            const expectedColName = dto.column_name ? dto.column_name.trim().toLowerCase() : '';
            const columnId = columnNameToIdMap[expectedColName] || fallbackColumnId;
            const assigneeId = dto.assignee_user_id ? aliasToRealId[dto.assignee_user_id] : null;

            const safeStartDate = !isNaN(Date.parse(dto.start_date)) ? new Date(dto.start_date) : undefined;
            const safeDueDate = !isNaN(Date.parse(dto.due_date)) ? new Date(dto.due_date) : undefined;

            const parentTask = new Task({
                project_id: projectId,
                board_id: boardId,
                column_id: columnId,
                title: dto.title || dto.name || 'Untitled Task',
                description: dto.description,
                story_point: dto.story_point || 0,
                ai_suggested_point: dto.story_point || 0,
                ai_estimated_reason: dto.ai_estimation_reason,
                start_date: safeStartDate,
                due_date: safeDueDate,
                assignees_user_id: assigneeId ? [assigneeId] : [],
                priority: dto.priority || 'MEDIUM',
                status: 'TODO',
                order: taskOrder++
            });

            tasksToSave.push(parentTask);

            if (dto.subtasks && dto.subtasks.length > 0) {
                for (const subDto of dto.subtasks) {
                    const subAssigneeId = subDto.assignee_user_id ? aliasToRealId[subDto.assignee_user_id] : assigneeId;
                    
                    tasksToSave.push(
                        new Task({
                            project_id: projectId,
                            board_id: boardId,
                            column_id: columnId,
                            parent_task_id: parentTask._id, 
                            title: subDto.title || subDto.name || 'Untitled Subtask',
                            description: subDto.description,
                            assignees_user_id: subAssigneeId ? [subAssigneeId] : [],
                            priority: subDto.priority || 'MEDIUM',
                            status: 'TODO',
                            order: taskOrder++
                        })
                    );
                }
            }
        }

        if (tasksToSave.length > 0) {
            // 🚀 BƯỚC QUAN TRỌNG: Lấy mảng ID sau khi Insert để cập nhật vào Column
            const insertedTasks = await Task.insertMany(tasksToSave);
            
            const colUpdates = {}; 
            insertedTasks.forEach(task => {
                // Chỉ nhét Task cha vào giao diện Kanban
                if (!task.parent_task_id) {
                    const cId = task.column_id.toString();
                    if (!colUpdates[cId]) colUpdates[cId] = [];
                    colUpdates[cId].push(task._id);
                }
            });

            // 🚀 Cập nhật task_order_ids cho từng cột
            const bulkColOps = Object.keys(colUpdates).map(cId => ({
                updateOne: {
                    filter: { _id: cId },
                    update: { $push: { task_order_ids: { $each: colUpdates[cId] } } }
                }
            }));
            
            if (bulkColOps.length > 0) {
                await Column.bulkWrite(bulkColOps);
            }
        }

        // =====================================================
        // 8. LƯU LẠI BỘ NÃO CHO LẦN SAU
        // =====================================================
        if (!aiContext.messages || !Array.isArray(aiContext.messages)) {
            aiContext.messages = [];
        }
        aiContext.messages.push({
            
            role: 'user',
            content: `Phát triển tiếp bảng với mode: ${generationMode} - ${userPrompt}`
        });

        aiContext.messages.push({
            role: 'model',
            content: finalCleanedJson
        });

        await aiContext.save();
        return finalResponse;

    } catch (error) {
        console.error('Smart Task Generation Error:', error);
        throw error;
    }
};

/**
 * ========================================================================
 * 2. AI DEVIATION INSIGHTS (ĐÁNH GIÁ CHÊNH LỆCH ĐIỂM)
 * ========================================================================
 */
exports.getDeviationInsights = async (projectId) => {
    try {
        const completedTasks = await Task.find({
            project_id: projectId,
            status: 'DONE',
            ai_suggested_point: { $exists: true, $ne: null }
        }).lean();

        const insights = completedTasks.map((task) => {
            const suggested = task.ai_suggested_point || 0;
            const actual = task.story_point || 0;

            let deviationPercent = 0;
            if (suggested > 0) {
                deviationPercent = ((actual - suggested) / suggested) * 100;
            }

            let status = '';
            let comment = '';

            if (Math.abs(deviationPercent) <= 10) {
                status = 'ACCURATE';
                comment = 'AI ước lượng khá sát với thực tế triển khai.';
            } else if (deviationPercent > 10) {
                status = 'UNDERESTIMATED';
                comment = `AI ước lượng thấp hơn thực tế. Task tốn thêm ${deviationPercent.toFixed(1)}% nỗ lực`;
            } else {
                status = 'OVERESTIMATED';
                comment = `AI ước lượng dư. Team hoàn thành sớm ${Math.abs(deviationPercent).toFixed(1)}%`;
            }

            return {
                task_id: task._id,
                title: task.title,
                suggested_point: suggested,
                actual_point: actual,
                deviation_percent: Math.round(deviationPercent * 100) / 100,
                status,
                comment
            };
        });

        return insights;
    } catch (error) {
        console.error('Deviation Insight Error:', error);
        throw new AppError('Failed to generate deviation insights', 500, 'INSIGHT_ERROR');
    }
};