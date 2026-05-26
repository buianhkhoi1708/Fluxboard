const eventBus = require('../../../common/utils/eventBus');
const notificationDispatcher = require('../services/notificationDispatcher.service');

// Bộ nhớ tạm lưu trữ danh sách ID các Task mới tạo đang trong vòng 10 phút chờ hoãn
const pendingCreations = new Set();

// Chống gửi trùng notification hoàn thành task khi FE/socket/API bắn liên tiếp
const recentlyCompletedTasks = new Set();

// Debounce update/move
const DEBOUNCE_TIME_MS = 60000;
const taskTimers = new Map();

const getTaskIdFromPayload = (payload = {}) => {
    return payload.task_id || payload.taskId;
};

const clearTaskTimer = (timerKey) => {
    if (!taskTimers.has(timerKey)) return;

    clearTimeout(taskTimers.get(timerKey));
    taskTimers.delete(timerKey);
};

const clearTaskDebounceTimers = (taskId) => {
    if (!taskId) return;

    clearTaskTimer(`UPDATE_${taskId}`);
    clearTaskTimer(`MOVE_${taskId}`);
};

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
// 1. SỰ KIỆN TẠO TASK MỚI
// ==========================================
eventBus.on('task_created', async (payload) => {
    const taskId = getTaskIdFromPayload(payload);
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
    const taskId = getTaskIdFromPayload(payload);
    if (!taskId) return;

    const taskKey = taskId.toString();

    if (recentlyCompletedTasks.has(taskKey)) {
        return;
    }

    recentlyCompletedTasks.add(taskKey);

    // Nếu trước đó task đang có update/move debounce chờ gửi thì xóa đi,
    // tránh vừa báo hoàn thành xong lại bị báo update/move cũ.
    clearTaskDebounceTimers(taskKey);

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
// 4. SỰ KIỆN CẬP NHẬT TASK
// ==========================================
eventBus.on('system_task_updated', (payload) => {
    const taskId = getTaskIdFromPayload(payload);
    if (!taskId) return;

    const taskKey = taskId.toString();

    // Nếu task này đang nằm trong danh sách chờ 10 phút của tạo mới -> bỏ qua thông báo update
    if (pendingCreations.has(taskKey)) {
        return;
    }

    // Nếu vừa hoàn thành trong 30s thì không gửi update thường nữa
    if (recentlyCompletedTasks.has(taskKey)) {
        return;
    }

    const timerKey = `UPDATE_${taskKey}`;
    handleDebouncedEvent(timerKey, payload, notificationDispatcher.dispatchTaskUpdated);
});

// ==========================================
// 5. SỰ KIỆN KÉO THẢ / MOVE TASK
// ==========================================
eventBus.on('system_task_moved', (payload) => {
    const taskId = getTaskIdFromPayload(payload);
    if (!taskId) return;

    const taskKey = taskId.toString();

    // Nếu task này đang nằm trong danh sách chờ 10 phút của tạo mới -> bỏ qua thông báo move
    if (pendingCreations.has(taskKey)) {
        return;
    }

    // Nếu vừa hoàn thành trong 30s thì không gửi move thường nữa
    if (recentlyCompletedTasks.has(taskKey)) {
        return;
    }

    const timerKey = `MOVE_${taskKey}`;
    handleDebouncedEvent(timerKey, payload, notificationDispatcher.dispatchTaskMoved);
});