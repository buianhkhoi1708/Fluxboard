const cron = require('node-cron');
const Task = require('../../task/models/task.model');     
const Column = require('../../column/models/column.model'); 
const User = require('../../user/models/user.model');

// Trỏ về đúng nhà của deadlineService
const deadlineService = require('../services/deadline.service'); 

const scheduleTaskDeadlineCheck = () => {
    // Chạy lúc 8h sáng mỗi ngày. Để test bạn có thể đổi thành '* * * * *'
    cron.schedule('0 8 * * *', async () => {
        console.log('--- [CRON JOB] Starting Task Deadline Check ---');
        try {
            const now = new Date();
            const tomorrow = new Date();
            tomorrow.setDate(now.getDate() + 1); 

            const doneColumns = await Column.find({ name: { $regex: /done|hoàn thành/i } }).select('_id').lean();
            const doneColumnIds = doneColumns.map(col => col._id);

            const upcomingTasks = await Task.find({
                due_date: { $gte: now, $lte: tomorrow },
                assignee_id: { $ne: null },
                column_id: { $nin: doneColumnIds }
            }).lean();

            console.log(`Found ${upcomingTasks.length} tasks due in the next 24 hours.`);

            for (const task of upcomingTasks) {
                const user = await User.findById(task.assignee_id).select('email full_name _id').lean();
                if (user) {
                    await deadlineService.dispatchTaskDeadlineNotification(user, task);
                }
            }
            console.log('--- [CRON JOB] Finished Task Deadline Check ---');
        } catch (error) {
            console.error('[CRON JOB Error] Failed to check task deadlines:', error);
        }
    });
};

module.exports = scheduleTaskDeadlineCheck;