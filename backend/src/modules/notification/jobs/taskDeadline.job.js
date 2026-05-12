const cron = require('node-cron');
const Task = require('../../board/models/task.model');
const User = require('../../user/models/user.model');
const Column = require('../../board/models/column.model');
const notificationService = require('../services/notification.service');

// Cài đặt chạy vào lúc 08:00 sáng mỗi ngày: '0 8 * * *'
// Để test ngay lập tức, bạn có thể đổi thành '* * * * *' (chạy mỗi phút)
const scheduleTaskDeadlineCheck = () => {
    cron.schedule('0 8 * * *', async () => {
        console.log('--- [CRON JOB] Starting Task Deadline Check ---');
        try {
            const now = new Date();
            const tomorrow = new Date();
            tomorrow.setDate(now.getDate() + 1); // Quét các task tới hạn trong vòng 24h tới

            // Tìm các cột mang ý nghĩa "Done" hoặc "Hoàn thành" để loại trừ task đã xong
            const doneColumns = await Column.find({ name: { $regex: /done|hoàn thành/i } }).select('_id').lean();
            const doneColumnIds = doneColumns.map(col => col._id);

            // Tìm task có due_date trong khoảng từ nay đến ngày mai, có người phụ trách và chưa nằm ở cột "Done"
            const upcomingTasks = await Task.find({
                due_date: { $gte: now, $lte: tomorrow },
                assignee_id: { $ne: null },
                column_id: { $nin: doneColumnIds }
            }).lean();

            console.log(`Found ${upcomingTasks.length} tasks due in the next 24 hours.`);

            // Gửi thông báo cho từng người
            for (const task of upcomingTasks) {
                const user = await User.findById(task.assignee_id).select('email full_name _id').lean();
                if (user) {
                    await notificationService.dispatchTaskDeadlineNotification(user, task);
                }
            }

            console.log('--- [CRON JOB] Finished Task Deadline Check ---');
        } catch (error) {
            console.error('[CRON JOB ERROR]:', error);
        }
    });
};

module.exports = scheduleTaskDeadlineCheck;