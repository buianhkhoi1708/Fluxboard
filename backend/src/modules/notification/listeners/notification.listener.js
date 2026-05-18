const eventBus = require('../../../common/utils/eventBus');
const notificationDispatcher = require('../services/notificationDispatcher.service');

// ==========================================
// 1. SỰ KIỆN DEADLINE (Quan trọng -> Gửi ngay lập tức)
// ==========================================
eventBus.on('extension_requested', async (payload) => {
    await notificationDispatcher.dispatchExtensionRequest(payload);
});

eventBus.on('extension_approved', async (payload) => {
    await notificationDispatcher.dispatchExtensionApproved(payload);
});

eventBus.on('extension_rejected', async (payload) => {
    await notificationDispatcher.dispatchExtensionRejected(payload);
});

// ==========================================
// 2. LOGIC DEBOUNCE (TRÌ HOÃN 1 PHÚT CHO TASK)
// ==========================================
const DEBOUNCE_TIME_MS = 60000; // 60,000 ms = 1 phút
const taskTimers = new Map(); // Bộ nhớ tạm lưu trữ các đồng hồ đếm ngược

/**
 * Hàm xử lý trì hoãn thông báo
 * @param {string} timerKey - Khóa định danh cho loại thông báo & Task (VD: UPDATE_123)
 * @param {object} payload - Dữ liệu sự kiện
 * @param {Function} dispatchFunction - Hàm gọi sang Dispatcher
 */
const handleDebouncedEvent = (timerKey, payload, dispatchFunction) => {
    // 1. ĐÃ CÓ THAY ĐỔI MỚI: Nếu Task này đang có đồng hồ đếm ngược rồi -> Hủy bỏ nó (Reset)
    if (taskTimers.has(timerKey)) {
        clearTimeout(taskTimers.get(timerKey));
        console.log(`[Debounce] Task changed again! Resetting 1-minute timer for: ${timerKey}`);
    }

    // 2. BẮT ĐẦU ĐẾM GIỜ LẠI: Cài đặt đồng hồ 1 phút mới
    const timer = setTimeout(async () => {
        // Hết 1 phút mà không ai đụng vào -> Xóa đồng hồ khỏi Map và Gửi thông báo
        taskTimers.delete(timerKey);
        console.log(`[Debounce] Time's up! Dispatching notification for: ${timerKey}`);
        await dispatchFunction(payload);
    }, DEBOUNCE_TIME_MS);

    // 3. LƯU ĐỒNG HỒ: Ghi nhớ cái đồng hồ này vào Map để lần sau còn biết mà hủy
    taskTimers.set(timerKey, timer);
};

// ==========================================
// 3. SỰ KIỆN KÉO THẢ & CẬP NHẬT (Áp dụng Trì hoãn 1 phút)
// ==========================================
eventBus.on('system_task_updated', (payload) => {
    const timerKey = `UPDATE_${payload.taskId}`;
    handleDebouncedEvent(timerKey, payload, notificationDispatcher.dispatchTaskUpdated);
});

eventBus.on('system_task_moved', (payload) => {
    const timerKey = `MOVE_${payload.taskId}`;
    handleDebouncedEvent(timerKey, payload, notificationDispatcher.dispatchTaskMoved);
});