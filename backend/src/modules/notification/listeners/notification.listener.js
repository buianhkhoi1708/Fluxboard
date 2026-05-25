const eventBus = require('../../../common/utils/eventBus');
const notificationDispatcher = require('../services/notificationDispatcher.service');

// Bộ nhớ tạm lưu trữ danh sách ID các Task mới tạo đang trong vòng 10 phút chờ hoãn
const pendingCreations = new Set();

const recentlyCompletedTasks = new Set();

// ==========================================
// 1. SỰ KIỆN TẠO TASK MỚI
// ==========================================
eventBus.on('task_created', async (payload) => {
    const taskId = payload.task_id || payload.taskId;
    if (!taskId) return;

    const taskKey = taskId.toString();
    pendingCreations.add(taskKey);

    try {
        await notificationDispatcher.dispatchTaskCreated(payload);
    } catch (error) {
        console.error('Error dispatching task created notification:', error);
    }

    // Vẫn giữ task này trong pendingCreations 10 phút để chặn spam update/move
    setTimeout(() => {
        pendingCreations.delete(taskKey);
    }, 600000);
});

// ==========================================
// 2. SỰ KIỆN GIA HẠN DEADLINE
// ==========================================
eventBus.on('extension_requested', async (payload) => {
    try {
        await notificationDispatcher.dispatchExtensionRequest(payload);
    } catch (error) {
        console.error('Error dispatching extension requested notification:', error);
    }
});

eventBus.on('extension_approved', async (payload) => {
    try {
        await notificationDispatcher.dispatchExtensionApproved(payload);
    } catch (error) {
        console.error('Error dispatching extension approved notification:', error);
    }
});

eventBus.on('extension_rejected', async (payload) => {
    try {
        await notificationDispatcher.dispatchExtensionRejected(payload);
    } catch (error) {
        console.error('Error dispatching extension rejected notification:', error);
    }
});

// ==========================================
// 3. SỰ KIỆN HOÀN THÀNH TASK
// ==========================================
const dispatchTaskCompletedOnce = async (payload) => {
    const taskId = payload.task_id || payload.taskId;
    if (!taskId) return;

    const taskKey = taskId.toString();

    if (recentlyCompletedTasks.has(taskKey)) {
        return;
    }

    recentlyCompletedTasks.add(taskKey);

    try {
        await notificationDispatcher.dispatchTaskCompleted(payload);
    } catch (error) {
        console.error('Error dispatching task completed notification:', error);
    }

    setTimeout(() => {
        recentlyCompletedTasks.delete(taskKey);
    }, 30000);
};

eventBus.on('task_completed', async (payload) => {
    await dispatchTaskCompletedOnce(payload);
});

eventBus.on('system_task_completed', async (payload) => {
    await dispatchTaskCompletedOnce(payload);
});

// ==========================================
// 4. LOGIC DEBOUNCE CHO CẬP NHẬT / KÉO THẢ TASK
// ==========================================
const DEBOUNCE_TIME_MS = 60000;
const taskTimers = new Map();

const handleDebouncedEvent = (timerKey, payload, dispatchFunction) => {
    if (taskTimers.has(timerKey)) {
        clearTimeout(taskTimers.get(timerKey));
    }

    const timer = setTimeout(async () => {
        taskTimers.delete(timerKey);

        try {
            await dispatchFunction(payload);
        } catch (error) {
            console.error(`Error dispatching debounced notification ${timerKey}:`, error);
        }
    }, DEBOUNCE_TIME_MS);

    taskTimers.set(timerKey, timer);
};

// ==========================================
// 5. SỰ KIỆN CẬP NHẬT TASK
// ==========================================
eventBus.on('system_task_updated', (payload) => {
    const taskId = payload.taskId || payload.task_id;
    if (!taskId) return;

    // Nếu task này đang nằm trong danh sách chờ 10 phút của tạo mới -> bỏ qua thông báo update
    if (pendingCreations.has(taskId.toString())) {
        return;
    }

    const timerKey = `UPDATE_${taskId}`;
    handleDebouncedEvent(timerKey, payload, notificationDispatcher.dispatchTaskUpdated);
});

// ==========================================
// 6. SỰ KIỆN KÉO THẢ / MOVE TASK
// ==========================================
eventBus.on('system_task_moved', (payload) => {
    const taskId = payload.taskId || payload.task_id;
    if (!taskId) return;

    // Nếu task này đang nằm trong danh sách chờ 10 phút của tạo mới -> bỏ qua thông báo move
    if (pendingCreations.has(taskId.toString())) {
        return;
    }

    const timerKey = `MOVE_${taskId}`;
    handleDebouncedEvent(timerKey, payload, notificationDispatcher.dispatchTaskMoved);
});