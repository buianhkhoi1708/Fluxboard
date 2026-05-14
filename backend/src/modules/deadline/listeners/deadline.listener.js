const eventBus = require('../../../common/utils/eventBus');
const TaskDeadline = require('../models/taskDeadline.model');

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

// 💡 TÍNH TOÁN ĐỘ TRỄ KHI TASK HOÀN THÀNH
eventBus.on('task_completed', async (payload) => {
    try {
        const deadline = await TaskDeadline.findOne({ task_id: payload.task_id });
        if (!deadline) return;

        const now = new Date();
        deadline.actual_completed_at = now;

        // KIỂM TRA TRỄ HẠN
        if (now.getTime() > deadline.due_date.getTime()) {
            deadline.completion_status = 'LATE';
            // Tính số phút trễ
            const diffMs = now.getTime() - deadline.due_date.getTime();
            deadline.late_minutes = Math.floor(diffMs / 60000); 

            console.log(`⚠️ [Deadline System] Task ${payload.task_id} completed LATE by ${deadline.late_minutes} minutes`);
            
            // Bắn sự kiện trễ cho module Activity/Notification (Nếu cần)
            eventBus.emit('task_completed_late', { task_id: payload.task_id, late_minutes: deadline.late_minutes });
        } else {
            deadline.completion_status = 'ON_TIME';
            console.log(`✅ [Deadline System] Task ${payload.task_id} completed ON TIME`);
        }

        await deadline.save();
    } catch (error) {
        console.error(`❌ [Deadline System] Update completion error:`, error);
    }
});