const cron = require('node-cron');
const Notification = require('../models/notification.model');
const notificationService = require('../services/notification.service');

// Quét mỗi phút 1 lần
cron.schedule('* * * * *', async () => {
    try {
        const now = new Date();
        
        // Tìm thông báo đã hết 10 phút chờ
        const pendingNotifs = await Notification.find({
            status: 'PENDING',
            send_at: { $lte: now }
        });

        if (pendingNotifs.length > 0) {
            console.log(`[Queue] Sending ${pendingNotifs.length} delayed notification...`);
            for (const notif of pendingNotifs) {
                await notificationService.executePendingNotification(notif._id);
            }
        }
    } catch (error) {
        console.error('Error when running cron job notification queue:', error);
    }
});