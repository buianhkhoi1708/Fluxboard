const Activity = require('../models/activity.model');
const { paginate } = require('../../../common/utils/pagination.util');

// Cấu hình chỉ lấy 3 trường an toàn của User, bỏ qua toàn bộ phần còn lại
const safePopulate = {
    path: 'actor_id',
    select: 'full_name email avatar_url' // Phân cách bằng dấu cách
};

exports.logActivity = async (data) => {
    try {
        await Activity.create(data);
    } catch (error) {
        console.error('Failed to log activity:', error);
    }
};

exports.getProjectActivities = async (projectId, page = 1, limit = 20) => {
    return await paginate(Activity, { project_id: projectId }, page, limit, safePopulate);
};

exports.getTaskActivities = async (taskId, page = 1, limit = 20) => {
    // Truyền safePopulate vào thay vì chỉ truyền chữ 'actor_id'
    return await paginate(Activity, { target_id: taskId, target_type: 'Task' }, page, limit, safePopulate);
};