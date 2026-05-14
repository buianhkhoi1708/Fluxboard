const eventBus = require('../../../common/utils/eventBus');
const activityService = require('../services/activity.service');
const Task = require('../../task/models/task.model'); // 💡 Thêm model Task để móc dữ liệu

// ==========================================
// 💡 HÀM HELPER: Dò tìm Project ID từ Task ID
// ==========================================
const getProjectIdFromTask = async (taskId) => {
    try {
        // Populate bảng Board để lấy được project_id
        const task = await Task.findById(taskId).populate('board_id').lean();
        if (task && task.board_id && task.board_id.project_id) {
            return task.board_id.project_id;
        }
        return null;
    } catch (error) {
        return null;
    }
};

// 1. Lắng nghe: Xin dời hạn
eventBus.on('extension_requested', async (payload) => {
    const projectId = await getProjectIdFromTask(payload.taskId);

    await activityService.logActivity({
        action: 'EXTENSION_REQUEST', 
        source: 'USER',
        actor_id: payload.userId,
        target_id: payload.taskId,
        target_type: 'Task',
        project_id: projectId, // 🚀 BƠM PROJECT_ID VÀO ĐÂY ĐỂ POSTMAN TÌM THẤY!
        details: { 
            message: `Requested a deadline extension to ${new Date(payload.newDueDate).toLocaleDateString()}`, 
            reason: payload.reason 
        }
    });
});

// 2. Lắng nghe: Sếp duyệt dời hạn
eventBus.on('extension_approved', async (payload) => {
    const projectId = await getProjectIdFromTask(payload.taskId);

    await activityService.logActivity({
        action: 'EXTENSION_APPROVE', 
        source: 'USER',
        actor_id: payload.managerId,
        target_id: payload.taskId,
        target_type: 'Task',
        project_id: projectId, // 🚀 BƠM VÀO ĐÂY
        details: { message: `Approved the deadline extension request` }
    });
});

// 3. Lắng nghe: Sếp từ chối
eventBus.on('extension_rejected', async (payload) => {
    const projectId = await getProjectIdFromTask(payload.taskId);

    await activityService.logActivity({
        action: 'EXTENSION_REJECT', 
        source: 'USER',
        actor_id: payload.managerId,
        target_id: payload.taskId,
        target_type: 'Task',
        project_id: projectId, // 🚀 BƠM VÀO ĐÂY
        details: { message: `Rejected the deadline extension request`, reason: payload.rejectReason }
    });
});

// 4. Lắng nghe: Task hoàn thành trễ
eventBus.on('task_completed_late', async (payload) => {
    const projectId = await getProjectIdFromTask(payload.task_id);

    await activityService.logActivity({
        action: 'LATE_COMPLETION', 
        source: 'SYSTEM', 
        actor_id: null,
        target_id: payload.task_id,
        target_type: 'Task',
        project_id: projectId, // 🚀 BƠM VÀO ĐÂY
        details: { message: `Task was completed late by ${payload.late_minutes} minutes` }
    });
});