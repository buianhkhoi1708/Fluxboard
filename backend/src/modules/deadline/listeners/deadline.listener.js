const eventBus = require('../../../common/utils/eventBus');
const TaskDeadline = require('../models/taskDeadline.model');

// Lắng nghe sự kiện "Vừa tạo Task mới" từ module Task ném sang
eventBus.on('task_created', async (payload) => {
    try {
        if (payload.due_date) {
            await TaskDeadline.create({
                task_id: payload.task_id,
                start_date: payload.start_date || new Date(),
                due_date: payload.due_date,
                extension_limit: payload.extension_limit || 2
            });
            console.log(`⏱️ [Deadline System] Task tracking has been automatically scheduled: ${payload.task_id}`);
        }
    } catch (error) {
        console.error(`❌ [Deadline System] Error creating a tracking schedule:`, error);
    }
});

// Lắng nghe sự kiện "Task đã hoàn thành" để chốt thời gian
eventBus.on('task_completed', async (payload) => {
    try {
        await TaskDeadline.findOneAndUpdate(
            { task_id: payload.task_id },
            { actual_completed_at: new Date() }
        );
        console.log(`✅ [Deadline System] The completion time for Task has been finalized:${payload.task_id}`);
    } catch (error) {
        console.error(`❌ [Deadline System] Update completion error:`, error);
    }
});