const cron = require('node-cron');
const TaskDeadline = require('../models/taskDeadline.model'); 

const Task = require('../../task/models/task.model');     
const User = require('../../user/models/user.model');
const deadlineService = require('../services/deadline.service'); 

const scheduleTaskDeadlineCheck = () => {
    cron.schedule('0 8 * * *', async () => {
        console.log('--- [CRON JOB] Starting Task Deadline Check ---');
        try {
            const now = new Date();
            const tomorrow = new Date();
            tomorrow.setDate(now.getDate() + 1); 

            // TÌM CÁC TASK SẮP TỚI HẠN
            const upcomingDeadlines = await TaskDeadline.find({
                due_date: { $gte: now, $lte: tomorrow },
                actual_completed_at: null, 
                is_deleted: false
            }).populate('task_id').lean();

            console.log(`Found ${upcomingDeadlines.length} tasks due in the next 24 hours.`);

            for (const deadline of upcomingDeadlines) {
                const task = deadline.task_id;
                if (!task || !task.assignee_id) continue;

                const user = await User.findById(task.assignee_id).select('email full_name _id').lean();
                if (user) {
                    await deadlineService.dispatchTaskDeadlineNotification(user, task, deadline);
                }
            }

            // TỰ ĐỘNG ĐÁNH DẤU TRỄ HẠN (OVERDUE) CHO DASHBOARD
            const overdueResult = await TaskDeadline.updateMany({
                due_date: { $lt: now },
                actual_completed_at: null,
                is_overdue: false,
                is_deleted: false
            }, {
                $set: { is_overdue: true }
            });

            if (overdueResult.modifiedCount > 0) {
                console.log(`🚨 Marked ${overdueResult.modifiedCount} tasks as OVERDUE.`);
            }

            console.log('--- [CRON JOB] Finished Task Deadline Check ---');
        } catch (error) {
            console.error('[CRON JOB Error] Failed to check task deadlines:', error);
        }
    });
};

module.exports = scheduleTaskDeadlineCheck;