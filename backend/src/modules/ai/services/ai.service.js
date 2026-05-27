const { GoogleGenerativeAI } = require('@google/generative-ai');
const mongoose = require('mongoose');
const AppError = require('../../../common/exceptions/AppError');

const AiContext = require('../models/aiContext.model');
const TaskDeadline = require('../../deadline/models/taskDeadline.model');
const Activity = require('../../activity/models/activity.model');
const Task = require('../../task/models/task.model');
const Comment = require('../../task/models/comment.model');
const Column = require('../../column/models/column.model');
const User = require('../../user/models/user.model');
const Board = require('../../board/models/board.model');
const Project = require('../../project/models/project.model');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const flashModel = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: 'application/json' }
});

const proModel = genAI.getGenerativeModel({
    model: 'gemini-2.5-pro',
    generationConfig: { responseMimeType: 'application/json' }
});

const parseGeminiJson = (textResponse) => {
    if (!textResponse || typeof textResponse !== 'string') throw new Error('AI trả về nội dung rỗng hoặc không phải chuỗi.');
    const cleanedText = textResponse.replace(/```(?:json)?\s*|\s*```/gi, '').trim();
    return JSON.parse(cleanedText);
};

const toObjectId = (value) => {
    if (!value) return null;
    const str = String(value);
    return mongoose.Types.ObjectId.isValid(str) ? new mongoose.Types.ObjectId(str) : null;
};

const normalizeColumnKey = (value) => String(value || '').trim().toLowerCase();
const getColumnName = (column) => column?.name || column?.list_name || column?.title || '';
const toValidDateOrNull = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const normalizePriority = (value) => {
    const priority = String(value || 'MEDIUM').trim().toUpperCase();
    return ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(priority) ? priority : 'MEDIUM';
};

const normalizeStoryPoint = (value) => {
    const numberValue = Number(value || 0);
    if (!Number.isFinite(numberValue) || numberValue <= 0) return 0;
    return Math.round(numberValue);
};

const trimAiHistory = (messages = []) => Array.isArray(messages) ? messages.slice(-20) : [];

const buildTaskDeadlineBulkOps = (tasks = []) => {
    return tasks.filter((task) => task.due_date).map((task) => ({
        updateOne: {
            filter: { task_id: task._id },
            update: {
                $setOnInsert: {
                    task_id: task._id,
                    start_date: task.start_date || null,
                    due_date: task.due_date,
                    actual_completed_at: null,
                    extension_limit: 2,
                    extension_count: 0,
                    extension_status: 'NONE',
                    pending_due_date: null,
                    extension_requested_by: null,
                    extension_requested_at: null,
                    extension_reason: '',
                    extension_reviewed_by: null,
                    extension_reviewed_at: null,
                    extension_reject_reason: '',
                    reminder_sent: false,
                    is_overdue: false,
                    completion_status: 'PENDING',
                    late_minutes: 0,
                    is_deleted: false
                }
            },
            upsert: true
        }
    }));
};

const persistTaskDeadlines = async (tasks = []) => {
    const deadlineOps = buildTaskDeadlineBulkOps(tasks);
    if (deadlineOps.length > 0) await TaskDeadline.bulkWrite(deadlineOps);
};

exports.generateBoardContext = async (userId, prompt) => {
    const systemInstruction = `Bạn là AI quản lý dự án. Hãy tạo cấu trúc board Kanban từ yêu cầu người dùng. Chỉ trả về JSON hợp lệ theo format:
{
  "suggested_columns": ["TO DO", "IN PROGRESS", "DONE"],
  "tasks": [
    {
      "title": "Tên task",
      "description": "Mô tả ngắn",
      "column_name": "TO DO",
      "priority": "MEDIUM",
      "subtasks": ["Việc con 1", "Việc con 2"]
    }
  ]
}`;

    const result = await flashModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        systemInstruction: { role: 'system', parts: [{ text: systemInstruction }] }
    });

    const data = parseGeminiJson(result.response.text());

    await AiContext.create({
        user_id: userId,
        context_type: 'GENERATE_BOARD',
        prompt_text: prompt,
        messages: [
            { role: 'user', content: prompt },
            { role: 'model', content: JSON.stringify(data) }
        ],
        status: 'SUCCESS'
    });

    return data;
};

exports.generateInsights = async (userId, projectId) => {
    const projectObjectId = toObjectId(projectId);
    if (!projectObjectId) throw new AppError('Project ID không hợp lệ.', 400, 'BAD_REQUEST');

    const project = await Project.findById(projectObjectId).lean();
    const boards = await Board.find({ project_id: projectObjectId, is_deleted: false }).select('_id name').lean();
    const boardIds = boards.map((board) => board._id);

    const tasks = await Task.find({ project_id: projectObjectId, is_deleted: false }).select('title description priority status is_done story_point ai_suggested_point due_date board_id').lean();

    const boardMap = new Map(boards.map((board) => [String(board._id), board.name]));
    const taskContext = tasks.slice(0, 120).map((task, index) => ({
        index: index + 1,
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: task.status,
        is_done: task.is_done,
        story_point: task.story_point || 0,
        board: boardMap.get(String(task.board_id)) || ''
    }));

    const prompt = `Phân tích rủi ro dự án "${project?.name || projectObjectId}" từ danh sách task sau và trả JSON:
${JSON.stringify(taskContext)}
Format:
{
  "summary": "Tóm tắt ngắn",
  "risks": [{"title":"Rủi ro","level":"LOW|MEDIUM|HIGH|CRITICAL","reason":"Lý do","recommendation":"Khuyến nghị"}],
  "recommendations": ["Khuyến nghị 1", "Khuyến nghị 2"]
}`;

    const result = await proModel.generateContent(prompt);
    const data = parseGeminiJson(result.response.text());

    await AiContext.create({
        user_id: userId,
        project_id: projectObjectId,
        context_type: 'GENERATE_INSIGHTS',
        prompt_text: prompt,
        messages: [
            { role: 'user', content: prompt },
            { role: 'model', content: JSON.stringify(data) }
        ],
        status: 'SUCCESS'
    });

    return data;
};

exports.generateSubtasks = async (userId, title, description = '') => {
    const prompt = `Hãy chia nhỏ task sau thành các subtask cụ thể. Chỉ trả JSON:
Task: ${title}
Mô tả: ${description || 'Không có'}
Format:
{
  "subtasks": [
    {"title":"Tên subtask","description":"Mô tả","priority":"LOW|MEDIUM|HIGH|CRITICAL"}
  ]
}`;

    const result = await flashModel.generateContent(prompt);
    const data = parseGeminiJson(result.response.text());
    const subtasks = Array.isArray(data?.subtasks) ? data.subtasks : [];

    await AiContext.create({
        user_id: userId,
        context_type: 'GENERATE_SUBTASKS',
        prompt_text: prompt,
        messages: [
            { role: 'user', content: prompt },
            { role: 'model', content: JSON.stringify(data) }
        ],
        status: 'SUCCESS'
    });

    return subtasks;
};

exports.summarizeTaskActivity = async (userId, taskId) => {
    const taskObjectId = toObjectId(taskId);
    if (!taskObjectId) throw new AppError('Task ID không hợp lệ.', 400, 'BAD_REQUEST');

    const [task, comments, activities] = await Promise.all([
        Task.findById(taskObjectId).lean(),
        Comment.find({ task_id: taskObjectId }).sort({ created_at: -1 }).limit(30).lean(),
        Activity.find({ task_id: taskObjectId }).sort({ created_at: -1 }).limit(30).lean().catch(() => [])
    ]);

    if (!task) throw new AppError('Không tìm thấy công việc.', 404, 'NOT_FOUND');

    const prompt = `Tóm tắt hoạt động task sau bằng tiếng Việt, chỉ trả JSON:
Task: ${JSON.stringify({
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        story_point: task.story_point
    })}
Comments: ${JSON.stringify(comments.map((comment) => ({
        content: comment.content,
        created_at: comment.created_at
    })))}
Activities: ${JSON.stringify(activities)}
Format:
{
  "summary": "Tóm tắt ngắn",
  "important_updates": ["Ý chính 1", "Ý chính 2"],
  "next_actions": ["Việc nên làm tiếp"]
}`;

    const result = await flashModel.generateContent(prompt);
    const data = parseGeminiJson(result.response.text());

    await AiContext.create({
        user_id: userId,
        context_type: 'SUMMARIZE_ACTIVITY',
        prompt_text: prompt,
        messages: [
            { role: 'user', content: prompt },
            { role: 'model', content: JSON.stringify(data) }
        ],
        status: 'SUCCESS'
    });

    return data;
};

exports.generateSmartTasks = async (userId, boardId, projectId, userPrompt, memberIds, generationMode, startDate) => {
    try {
        const boardObjectId = toObjectId(boardId);
        const projectObjectId = toObjectId(projectId);
        const userObjectId = toObjectId(userId);

        if (!boardObjectId || !projectObjectId) throw new AppError('board_id hoặc project_id không hợp lệ.', 400, 'BAD_REQUEST');

        const existingColumns = await Column.find({ board_id: boardObjectId }).sort({ created_at: 1 }).lean();
        const existingColIds = existingColumns.map((column) => column._id);
        const existingTasks = existingColIds.length
            ? await Task.find({ column_id: { $in: existingColIds }, is_deleted: { $ne: true } }).select('_id title column_id').lean()
            : [];

        const currentColsStr = existingColumns.length ? existingColumns.map((column) => getColumnName(column)).filter(Boolean).join(', ') : 'Chưa có cột nào';
        const currentTasksStr = existingTasks.length ? existingTasks.map((task) => task.title).filter(Boolean).join(' | ') : 'Chưa có task nào';

        const aliasToRealId = {};
        let personnelContextStr = '';
        const safeMemberIds = Array.isArray(memberIds) ? memberIds.map(toObjectId).filter(Boolean) : [];

        if (safeMemberIds.length > 0) {
            const users = await User.find({ _id: { $in: safeMemberIds }, status: 'ACTIVE' }).select('_id full_name email team_id department_id').lean();
            let index = 1;
            users.forEach((user) => {
                const alias = `MEMBER_${index++}`;
                aliasToRealId[alias] = user._id;
                personnelContextStr += `- ${alias}: ${user.full_name || user.email || 'User'}\n`;
            });
        } else {
            personnelContextStr = 'CHƯA_CHỌN_NHÂN_SỰ';
        }

        let aiContext = await AiContext.findOne({ board_id: boardObjectId, context_type: 'GENERATE_SMART_TASKS', is_deleted: false });

        if (!aiContext) {
            aiContext = new AiContext({
                board_id: boardObjectId,
                project_id: projectObjectId,
                user_id: userObjectId,
                context_type: 'GENERATE_SMART_TASKS',
                prompt_text: userPrompt,
                messages: []
            });
        } else {
            aiContext.prompt_text = userPrompt;
            aiContext.project_id = projectObjectId;
            aiContext.user_id = userObjectId;
        }

        const modeInstruction = generationMode === 'SIMPLE'
            ? 'MÔ HÌNH: KANBAN ĐƠN GIẢN. Cố gắng sử dụng lại các cột đã có. Nếu chưa có cột nào, hãy đề xuất 3 cột: ["TO DO", "IN PROGRESS", "DONE"].'
            : 'MÔ HÌNH: ĐA GIAI ĐOẠN. Bạn có thể tái sử dụng cột cũ hoặc đề xuất thêm cột mới nếu cần.';

        const systemInstruction = `Bạn là một Chuyên gia Quản trị Dự án cấp cao.
HIỆN TRẠNG DỰ ÁN:
- Các cột hiện tại: ${currentColsStr}
- Các task đã tồn tại: ${currentTasksStr}

NHIỆM VỤ:
- Đề xuất thêm task mới, không tạo lại task đã tồn tại.
- Chỉ trả về JSON hợp lệ, không markdown.

DANH SÁCH NHÂN SỰ ĐỂ GÁN:
${personnelContextStr}

CHẾ ĐỘ SINH TASK:
${modeInstruction}

QUY ĐỊNH:
1. assignee_user_id phải là bí danh như "MEMBER_1". Nếu không có nhân sự thì để null.
2. story_point là số nguyên 1-21 theo Fibonacci.
3. priority chỉ dùng LOW, MEDIUM, HIGH, CRITICAL.
4. Phải có start_date và due_date hợp lý.

FORMAT:
{
  "suggested_columns": ["Tên cột"],
  "tasks": [
    {
      "title": "Tên task",
      "description": "Mô tả",
      "column_name": "Tên cột",
      "assignee_user_id": "MEMBER_1",
      "story_point": 5,
      "ai_estimation_reason": "Lý do",
      "priority": "HIGH",
      "start_date": "2026-05-15",
      "due_date": "2026-05-20",
      "subtasks": [{"title":"Tên việc con","description":"Chi tiết","assignee_user_id":"MEMBER_1","priority":"MEDIUM"}]
    }
  ]
}`;

        const chatHistory = trimAiHistory(aiContext.messages).map((message) => ({ role: message.role, parts: [{ text: message.content || '' }] }));

        const MAX_RETRIES = 3;
        let finalResponse = null;
        let finalCleanedJson = '';
        let lastError = '';

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            const promptToUse = attempt === 1 ? userPrompt : `${userPrompt}\n\nLỗi JSON lần trước: ${lastError}. Hãy trả về JSON hợp lệ đúng format.`;

            try {
                const result = await flashModel.generateContent({
                    contents: [...chatHistory, { role: 'user', parts: [{ text: promptToUse }] }],
                    systemInstruction: { role: 'system', parts: [{ text: systemInstruction }] }
                });

                finalResponse = parseGeminiJson(result.response.text());

                if (!finalResponse.tasks || !Array.isArray(finalResponse.tasks) || finalResponse.tasks.length === 0) {
                    throw new Error('Danh sách task rỗng hoặc sai định dạng.');
                }

                finalCleanedJson = JSON.stringify(finalResponse);
                break;
            } catch (error) {
                lastError = error.message;
                console.warn(`[AI Retry ${attempt}/${MAX_RETRIES}]`, lastError);
                if (attempt === MAX_RETRIES) throw new AppError(`AI format error: ${lastError}`, 500, 'AI_FORMAT_ERROR');
            }
        }

        const columnNameToIdMap = {};
        const newlyCreatedColIds = [];

        existingColumns.forEach((column) => {
            const columnName = getColumnName(column);
            if (columnName) columnNameToIdMap[normalizeColumnKey(columnName)] = column._id;
        });

        if (Array.isArray(finalResponse.suggested_columns)) {
            for (const colName of finalResponse.suggested_columns) {
                const cleanColName = String(colName || '').trim();
                const colKey = normalizeColumnKey(cleanColName);

                if (!cleanColName || columnNameToIdMap[colKey]) continue;

                const newColumn = await Column.create({ board_id: boardObjectId, name: cleanColName });
                columnNameToIdMap[colKey] = newColumn._id;
                newlyCreatedColIds.push(newColumn._id);
            }
        }

        if (newlyCreatedColIds.length > 0) {
            await Board.findByIdAndUpdate(boardObjectId, { $push: { column_order_ids: { $each: newlyCreatedColIds } } });
        }

        let fallbackColumnId = Object.values(columnNameToIdMap)[0];

        if (!fallbackColumnId) {
            const fallbackColumn = await Column.create({ board_id: boardObjectId, name: 'TO DO' });
            fallbackColumnId = fallbackColumn._id;
            columnNameToIdMap['to do'] = fallbackColumnId;
            await Board.findByIdAndUpdate(boardObjectId, { $push: { column_order_ids: fallbackColumnId } });
        }

        let taskOrder = existingTasks.length;
        const tasksToSave = [];

        for (const dto of finalResponse.tasks) {
            const expectedColKey = normalizeColumnKey(dto.column_name);
            const columnId = columnNameToIdMap[expectedColKey] || fallbackColumnId;
            const assigneeId = dto.assignee_user_id ? aliasToRealId[dto.assignee_user_id] : null;
            const safeStartDate = toValidDateOrNull(dto.start_date);
            const safeDueDate = toValidDateOrNull(dto.due_date);
            const storyPoint = normalizeStoryPoint(dto.story_point);

            const parentTask = new Task({
                project_id: projectObjectId,
                board_id: boardObjectId,
                column_id: columnId,
                author_user_id: userObjectId,
                title: dto.title || dto.name || 'Untitled Task',
                description: dto.description || '',
                story_point: storyPoint,
                ai_suggested_point: storyPoint,
                ai_estimated_reason: dto.ai_estimation_reason || dto.ai_estimated_reason || '',
                start_date: safeStartDate,
                due_date: safeDueDate,
                assignee_id: assigneeId || null,
                assignees_user_id: assigneeId ? [assigneeId] : [],
                priority: normalizePriority(dto.priority),
                status: 'TODO',
                is_done: false,
                is_deleted: false,
                order: taskOrder++
            });

            tasksToSave.push(parentTask);

            if (Array.isArray(dto.subtasks) && dto.subtasks.length > 0) {
                for (const subDto of dto.subtasks) {
                    const subAssigneeId = subDto.assignee_user_id ? aliasToRealId[subDto.assignee_user_id] : assigneeId;

                    tasksToSave.push(new Task({
                        project_id: projectObjectId,
                        board_id: boardObjectId,
                        column_id: columnId,
                        parent_task_id: parentTask._id,
                        author_user_id: userObjectId,
                        title: subDto.title || subDto.name || 'Untitled Subtask',
                        description: subDto.description || '',
                        assignee_id: subAssigneeId || null,
                        assignees_user_id: subAssigneeId ? [subAssigneeId] : [],
                        priority: normalizePriority(subDto.priority),
                        status: 'TODO',
                        is_done: false,
                        is_deleted: false,
                        order: taskOrder++
                    }));
                }
            }
        }

        let insertedTasks = [];

        if (tasksToSave.length > 0) {
            insertedTasks = await Task.insertMany(tasksToSave);

            const colUpdates = {};
            insertedTasks.forEach((task) => {
                if (!task.parent_task_id) {
                    const columnId = String(task.column_id);
                    if (!colUpdates[columnId]) colUpdates[columnId] = [];
                    colUpdates[columnId].push(task._id);
                }
            });

            const bulkColOps = Object.keys(colUpdates).map((columnId) => ({
                updateOne: {
                    filter: { _id: columnId },
                    update: { $push: { task_order_ids: { $each: colUpdates[columnId] } } }
                }
            }));

            if (bulkColOps.length > 0) await Column.bulkWrite(bulkColOps);
            await persistTaskDeadlines(insertedTasks);
        }

        aiContext.messages = trimAiHistory(aiContext.messages);
        aiContext.messages.push({ role: 'user', content: `Phát triển tiếp bảng với mode ${generationMode || 'SIMPLE'}: ${userPrompt}` });
        aiContext.messages.push({ role: 'model', content: finalCleanedJson });
        aiContext.status = 'SUCCESS';

        await aiContext.save();

        return {
            ...finalResponse,
            inserted_count: insertedTasks.length,
            saved_task_ids: insertedTasks.map((task) => task._id)
        };
    } catch (error) {
        console.error('Smart Task Generation Error:', error);
        throw error;
    }
};

exports.getDeviationInsights = async (projectId) => {
    const fibonacciPoints = [1, 2, 3, 5, 8, 13, 21];

    const nearestFibonacci = (value) => {
        const n = Number(value || 0);
        if (!Number.isFinite(n) || n <= 1) return 1;
        return fibonacciPoints.reduce((best, current) => {
            return Math.abs(current - n) < Math.abs(best - n) ? current : best;
        }, fibonacciPoints[0]);
    };

    const localEstimateTaskPoint = (task) => {
        const title = String(task.title || '').toLowerCase();
        const desc = String(task.description || '').toLowerCase();
        const text = `${title} ${desc}`;
        let score = 3;

        if (task.priority === 'CRITICAL') score += 5;
        else if (task.priority === 'HIGH') score += 3;
        else if (task.priority === 'MEDIUM') score += 1;

        if (text.length > 180) score += 2;
        if (/(database|schema|migration|rbac|permission|socket|realtime|payment|auth|security|deploy|docker|kubernetes|integration|api|backend)/i.test(text)) score += 3;
        if (/(ui|form|button|style|layout|responsive|css|tailwind)/i.test(text)) score += 1;
        if (/(bug|fix|hotfix|urgent|deadline|performance|optimize)/i.test(text)) score += 2;
        if (/(simple|minor|text|label|copy|rename)/i.test(text)) score -= 1;

        return nearestFibonacci(Math.max(1, score));
    };

    const buildFallbackInsight = ({ projectObjectId, project, tasks, compactTasks, actualTotal, reason }) => {
        const taskInsights = tasks.map((task) => {
            const suggested = localEstimateTaskPoint(task);
            const actual = Number(task.story_point || 0);
            const deviationPercent = suggested > 0 ? ((actual - suggested) / suggested) * 100 : 0;

            let status = 'ACCURATE';
            let comment = 'Fallback AI nội bộ ước tính gần với story point thực tế.';

            if (Math.abs(deviationPercent) > 10 && deviationPercent > 0) {
                status = 'UNDERESTIMATED';
                comment = `Fallback AI nội bộ ước lượng thấp hơn thực tế ${deviationPercent.toFixed(1)}%.`;
            }

            if (Math.abs(deviationPercent) > 10 && deviationPercent < 0) {
                status = 'OVERESTIMATED';
                comment = `Fallback AI nội bộ ước lượng cao hơn thực tế ${Math.abs(deviationPercent).toFixed(1)}%.`;
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

        const aiTotal = taskInsights.reduce((sum, task) => sum + Number(task.suggested_point || 0), 0);
        const totalDeviationPercent = aiTotal > 0 ? ((actualTotal - aiTotal) / aiTotal) * 100 : 0;

        let summaryStatus = 'ACCURATE';
        let summaryComment = 'AI fallback đã quét project bằng thuật toán nội bộ vì Gemini chưa trả được dữ liệu.';

        if (Math.abs(totalDeviationPercent) > 10 && totalDeviationPercent > 0) {
            summaryStatus = 'UNDERESTIMATED';
            summaryComment = `AI fallback ước lượng thấp hơn thực tế ${totalDeviationPercent.toFixed(1)}%. ${reason || ''}`.trim();
        }

        if (Math.abs(totalDeviationPercent) > 10 && totalDeviationPercent < 0) {
            summaryStatus = 'OVERESTIMATED';
            summaryComment = `AI fallback ước lượng cao hơn thực tế ${Math.abs(totalDeviationPercent).toFixed(1)}%. ${reason || ''}`.trim();
        }

        return {
            project_id: projectObjectId,
            project_name: project?.name || 'Project',
            ai_suggested_point: Math.round(aiTotal),
            actual_point: actualTotal,
            deviation_percent: Math.round(totalDeviationPercent * 100) / 100,
            status: summaryStatus,
            comment: summaryComment,
            tasks_count: tasks.length,
            scanned_tasks_count: compactTasks.length,
            source: 'LOCAL_FALLBACK',
            tasks: taskInsights
        };
    };

    try {
        const projectObjectId = toObjectId(projectId);

        if (!projectObjectId) {
            throw new AppError('Project ID không hợp lệ.', 400, 'BAD_REQUEST');
        }

        const [project, boards, tasks] = await Promise.all([
            Project.findById(projectObjectId).select('_id name').lean(),
            Board.find({ project_id: projectObjectId, is_deleted: false }).select('_id name').lean(),
            Task.find({
                project_id: projectObjectId,
                is_deleted: { $ne: true },
                story_point: { $gt: 0 }
            }).select('_id title description priority status is_done story_point board_id column_id assignees_user_id assignee_id').lean()
        ]);

        if (!tasks.length) {
            return {
                project_id: projectObjectId,
                project_name: project?.name || 'Project',
                ai_suggested_point: 0,
                actual_point: 0,
                deviation_percent: 0,
                status: 'NO_DATA',
                comment: 'Project chưa có task nào có story point để AI quét.',
                tasks_count: 0,
                scanned_tasks_count: 0,
                source: 'NO_DATA',
                tasks: []
            };
        }

        const boardMap = new Map(boards.map((board) => [String(board._id), board.name]));
        const columns = await Column.find({
            board_id: { $in: boards.map((board) => board._id) }
        }).select('_id name board_id').lean();

        const columnMap = new Map(columns.map((column) => [String(column._id), column.name]));
        const actualTotal = tasks.reduce((sum, task) => sum + Number(task.story_point || 0), 0);

        const compactTasks = tasks.slice(0, 120).map((task, index) => ({
            index: index + 1,
            task_id: String(task._id),
            title: task.title,
            description: task.description || '',
            priority: task.priority || 'MEDIUM',
            status: task.status || (task.is_done ? 'DONE' : 'TODO'),
            board: boardMap.get(String(task.board_id)) || '',
            column: columnMap.get(String(task.column_id)) || '',
            actual_story_point: Number(task.story_point || 0)
        }));

        const prompt = `Bạn là AI Project Estimator cấp senior. Hãy quét danh sách task của project và tự ước tính effort bằng story point.
Chỉ tính các task trong danh sách, không thêm task mới.
Không được copy nguyên actual_story_point làm kết quả. Hãy ước tính độc lập dựa trên title, description, priority, status, board, column.
Story point dùng số nguyên theo Fibonacci gần nhất: 1,2,3,5,8,13,21.
Trả về JSON hợp lệ, không markdown.

Project: ${project?.name || projectObjectId}
Tasks:
${JSON.stringify(compactTasks)}

Format bắt buộc:
{
  "project_ai_estimated_point": 34,
  "comment": "Nhận xét ngắn bằng tiếng Việt",
  "tasks": [
    {
      "task_id": "id",
      "title": "Tên task",
      "ai_suggested_point": 5,
      "reason": "Lý do ngắn"
    }
  ]
}`;

        let aiData = null;

        try {
            const result = await proModel.generateContent(prompt);
            aiData = parseGeminiJson(result.response.text());
        } catch (geminiError) {
            console.error('Gemini Deviation Scan Error:', geminiError);
            return buildFallbackInsight({
                projectObjectId,
                project,
                tasks,
                compactTasks,
                actualTotal,
                reason: 'Gemini chưa phản hồi hợp lệ nên hệ thống dùng fallback.'
            });
        }

        const aiTasks = Array.isArray(aiData.tasks) ? aiData.tasks : [];
        const aiTaskMap = new Map(aiTasks.map((task) => [String(task.task_id), task]));

        let aiTotal = Number(aiData.project_ai_estimated_point || 0);

        if (!Number.isFinite(aiTotal) || aiTotal <= 0) {
            aiTotal = aiTasks.reduce((sum, task) => sum + nearestFibonacci(task.ai_suggested_point), 0);
        }

        if (!Number.isFinite(aiTotal) || aiTotal <= 0) {
            return buildFallbackInsight({
                projectObjectId,
                project,
                tasks,
                compactTasks,
                actualTotal,
                reason: 'Gemini trả về tổng điểm không hợp lệ nên hệ thống dùng fallback.'
            });
        }

        const taskInsights = tasks.map((task) => {
            const aiTask = aiTaskMap.get(String(task._id));
            const suggested = aiTask ? nearestFibonacci(aiTask.ai_suggested_point) : localEstimateTaskPoint(task);
            const actual = Number(task.story_point || 0);
            const deviationPercent = suggested > 0 ? ((actual - suggested) / suggested) * 100 : 0;

            let status = 'ACCURATE';
            let comment = aiTask?.reason || 'AI ước tính gần với story point thực tế.';

            if (Math.abs(deviationPercent) > 10 && deviationPercent > 0) {
                status = 'UNDERESTIMATED';
                comment = aiTask?.reason || `AI ước lượng thấp hơn thực tế ${deviationPercent.toFixed(1)}%.`;
            }

            if (Math.abs(deviationPercent) > 10 && deviationPercent < 0) {
                status = 'OVERESTIMATED';
                comment = aiTask?.reason || `AI ước lượng cao hơn thực tế ${Math.abs(deviationPercent).toFixed(1)}%.`;
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

        const totalDeviationPercent = aiTotal > 0 ? ((actualTotal - aiTotal) / aiTotal) * 100 : 0;

        let summaryStatus = 'ACCURATE';
        let summaryComment = aiData.comment || 'Tổng ước lượng AI đang khá sát với tổng story point thực tế.';

        if (Math.abs(totalDeviationPercent) > 10 && totalDeviationPercent > 0) {
            summaryStatus = 'UNDERESTIMATED';
            summaryComment = aiData.comment || `AI đang ước lượng thấp hơn thực tế ${totalDeviationPercent.toFixed(1)}%.`;
        }

        if (Math.abs(totalDeviationPercent) > 10 && totalDeviationPercent < 0) {
            summaryStatus = 'OVERESTIMATED';
            summaryComment = aiData.comment || `AI đang ước lượng cao hơn thực tế ${Math.abs(totalDeviationPercent).toFixed(1)}%.`;
        }

        await AiContext.create({
            user_id: null,
            project_id: projectObjectId,
            context_type: 'DEVIATION_INSIGHTS',
            prompt_text: prompt,
            messages: [
                { role: 'user', content: prompt },
                { role: 'model', content: JSON.stringify(aiData) }
            ],
            status: 'SUCCESS'
        }).catch(() => null);

        return {
            project_id: projectObjectId,
            project_name: project?.name || 'Project',
            ai_suggested_point: Math.round(aiTotal),
            actual_point: actualTotal,
            deviation_percent: Math.round(totalDeviationPercent * 100) / 100,
            status: summaryStatus,
            comment: summaryComment,
            tasks_count: tasks.length,
            scanned_tasks_count: compactTasks.length,
            source: 'GEMINI',
            tasks: taskInsights
        };
    } catch (error) {
        console.error('Deviation Insight Error:', error);

        if (error instanceof AppError) {
            throw error;
        }

        throw new AppError(
            error?.message || 'Failed to generate deviation insights',
            500,
            'INSIGHT_ERROR'
        );
    }
};