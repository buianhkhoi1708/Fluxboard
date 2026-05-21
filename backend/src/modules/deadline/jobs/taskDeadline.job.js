const cron = require('node-cron');
const TaskDeadline = require('../models/taskDeadline.model'); 
const Task = require('../../task/models/task.model');     
const User = require('../../user/models/user.model');
const deadlineService = require('../services/deadline.service'); 
const notificationDispatcher = require('../../notification/services/notificationDispatcher.service');

const scheduleTaskDeadlineCheck = () => {
    // Cron Job chạy định kỳ vào lúc 08:00 sáng mỗi ngày để rà soát ngày mới
    cron.schedule('0 8 * * *', async () => {
        console.log('--- [CRON JOB] Starting Task Deadline Check ---');
        try {
            const now = new Date();
            const tomorrow = new Date();
            tomorrow.setDate(now.getDate() + 1); 

            // 1. Quét gửi cảnh báo nhắc nhở sớm cho các task cách hạn 24 giờ
            const upcomingDeadlines = await TaskDeadline.find({
                due_date: { $gte: now, $lte: tomorrow },
                actual_completed_at: null, 
                reminder_sent: false, 
                is_deleted: false
            }).populate('task_id').lean();

            for (const deadline of upcomingDeadlines) {
                const task = deadline.task_id;
                if (!task || !task.assignee_id) continue;

                const user = await User.findById(task.assignee_id).select('email full_name _id').lean();
                if (user) {
                    deadlineService.sendDelayedNotification(user, task, deadline, 10);
                    await TaskDeadline.findByIdAndUpdate(deadline._id, { reminder_sent: true });
                }
            }

            // 2. PHÁT HIỆN QUA NGÀY MỚI TRỄ HẠN -> ĐÁNH DẤU VÀ GỬI THÔNG BÁO LẬP TỨC
            const freshOverdueTasks = await TaskDeadline.find({
                due_date: { $llt: now },
                actual_completed_at: null,
                is_overdue: false, // Lọc ra những task vừa mới chạm mốc trễ hạn đầu ngày
                is_deleted: false
            }).populate('task_id');

            if (freshOverdueTasks.length > 0) {
                for (const deadline of freshOverdueTasks) {
                    const task = deadline.task_id;
                    if (!task) continue;

                    // Cập nhật trạng thái trễ hạn vào cơ sở dữ liệu
                    await TaskDeadline.findByIdAndUpdate(deadline._id, {
                        $set: { is_overdue: true }
                    });
                    
                    console.log(`🚨 [Cron Job] Marked task ${task._id} as OVERDUE.`);

                    // Gửi thông báo trễ hạn đến nhân sự được gán việc qua Email + Web Socket
                    if (task.assignee_id) {
                        try {
                            await notificationDispatcher.dispatchTaskOverdue(task.assignee_id, task, deadline);
                        } catch (err) {
                            console.error(`Failed to send overdue notice notification for task ${task._id}:`, err);
                        }
                    }
                }
            }

            console.log('--- [CRON JOB] Finished Task Deadline Check ---');
        } catch (error) {
            console.error('[CRON JOB Error] Failed to check task deadlines:', error);
        }
    });
};

module.exports = scheduleTaskDeadlineCheck;