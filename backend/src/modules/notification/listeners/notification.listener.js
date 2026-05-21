const eventBus = require('../../../common/utils/eventBus');
const notificationDispatcher = require('../services/notificationDispatcher.service');

// Bộ nhớ tạm lưu trữ danh sách ID các Task mới tạo đang trong vòng 10 phút chờ hoãn
const pendingCreations = new Set();

// ==========================================
// 1. SỰ KIỆN TẠO TASK MỚI (Trì hoãn 10 phút)
// ==========================================
eventBus.on('task_created', (payload) => {
    const taskId = payload.task_id || payload.taskId;
    if (!taskId) return;

    const taskKey = taskId.toString();
    pendingCreations.add(taskKey);

    // Thiết lập thời gian hoãn đúng 10 phút (10 * 60 * 1000 ms)
    setTimeout(async () => {
        // Xóa khỏi danh sách chờ sau khi hết 10 phút
        pendingCreations.delete(taskKey);
        try {
            await notificationDispatcher.dispatchTaskCreated(payload);
        } catch (error) {
            console.error('Error dispatching task created notification:', error);
        }
    }, 600000);
});

// ==========================================
// 2. SỰ KIỆN GIA HẠN (Gửi ngay lập tức)
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
// 3. LOGIC DEBOUNCE (TRÌ HOÃN 1 PHÚT CHO CẬP NHẬT)
// ==========================================
const DEBOUNCE_TIME_MS = 60000; 
const taskTimers = new Map(); 

const handleDebouncedEvent = (timerKey, payload, dispatchFunction) => {
    if (taskTimers.has(timerKey)) {
        clearTimeout(taskTimers.get(timerKey));
    }

    const timer = setTimeout(async () => {
        taskTimers.delete(timerKey);
        await dispatchFunction(payload);
    }, DEBOUNCE_TIME_MS);

    taskTimers.set(timerKey, timer);
};

// ==========================================
// 4. SỰ KIỆN KÉO THẢ & CẬP NHẬT (Chặn nếu đang trong 10 phút tạo mới)
// ==========================================
eventBus.on('system_task_updated', (payload) => {
    const taskId = payload.taskId;
    
    // Nếu task này đang nằm trong danh sách chờ 10 phút của tạo mới -> Bỏ qua hoàn toàn thông báo cập nhật dữ liệu
    if (pendingCreations.has(taskId.toString())) {
        return;
    }

    const timerKey = `UPDATE_${taskId}`;
    handleDebouncedEvent(timerKey, payload, notificationDispatcher.dispatchTaskUpdated);
});

eventBus.on('system_task_moved', (payload) => {
    const taskId = payload.taskId;

    // Nếu task này đang nằm trong danh sách chờ 10 phút của tạo mới -> Bỏ qua hoàn toàn thông báo chuyển stage trạng thái
    if (pendingCreations.has(taskId.toString())) {
        return;
    }

    const timerKey = `MOVE_${taskId}`;
    handleDebouncedEvent(timerKey, payload, notificationDispatcher.dispatchTaskMoved);
});