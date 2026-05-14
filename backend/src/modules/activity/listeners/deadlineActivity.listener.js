const eventBus = require('../../../common/utils/eventBus');
const activityService = require('../services/activity.service');

// 1. Lắng nghe: Xin dời hạn
eventBus.on('extension_requested', async (payload) => {
    await activityService.logActivity({
        action: 'EXTENSION_REQUEST', // 💡 Dùng Enum mới
        source: 'USER',
        actor_id: payload.userId,
        target_id: payload.taskId,
        target_type: 'Task',
        details: { 
            message: `Requested a deadline extension to ${new Date(payload.newDueDate).toLocaleDateString()}`, 
            reason: payload.reason 
        }
    });
});

// 2. Lắng nghe: Sếp duyệt dời hạn
eventBus.on('extension_approved', async (payload) => {
    await activityService.logActivity({
        action: 'EXTENSION_APPROVE', // 💡 Dùng Enum mới
        source: 'USER',
        actor_id: payload.managerId,
        target_id: payload.taskId,
        target_type: 'Task',
        details: { message: `Approved the deadline extension request` }
    });
});

// 3. Lắng nghe: Sếp từ chối
eventBus.on('extension_rejected', async (payload) => {
    await activityService.logActivity({
        action: 'EXTENSION_REJECT', // 💡 Dùng Enum mới
        source: 'USER',
        actor_id: payload.managerId,
        target_id: payload.taskId,
        target_type: 'Task',
        details: { message: `Rejected the deadline extension request`, reason: payload.rejectReason }
    });
});

// 4. Lắng nghe: Task hoàn thành trễ
eventBus.on('task_completed_late', async (payload) => {
    await activityService.logActivity({
        action: 'LATE_COMPLETION', // 💡 Dùng Enum mới
        source: 'SYSTEM', // Hệ thống tự động ghi nhận
        actor_id: null,
        target_id: payload.task_id,
        target_type: 'Task',
        details: { message: `Task was completed late by ${payload.late_minutes} minutes` }
    });
});