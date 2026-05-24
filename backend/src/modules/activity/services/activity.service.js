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

exports.getActivities = async ({ projectId, page, size, sourceType, action, from, to }) => {
    const query = {};
    
    // 🚀 Nếu có projectId thì lọc theo project, nếu không có thì lấy tất cả (dành cho Admin)
    if (projectId) query.project_id = projectId;
    
    if (sourceType) query.source = sourceType; // Lưu ý: Schema của Sếp tên là 'source' chứ không phải 'source_type'
    if (action) query.action = action;
    
    if (from || to) {
        query.created_at = {};
        if (from) query.created_at.$gte = new Date(from);
        if (to) query.created_at.$lte = new Date(to);
    }

    const totalElements = await Activity.countDocuments(query);
    const activities = await Activity.find(query)
        .populate('actor_id', 'full_name avatar') // Nhớ populate để UI có tên và avatar nhé Sếp
        .sort({ created_at: -1 })
        .skip(page * size)
        .limit(size)
        .lean();

    // Map lại data cho khớp chuẩn Frontend yêu cầu
    const formattedActivities = activities.map(act => ({
        id: act._id,
        message: act.details?.message || 'Có một hành động mới',
        actor: {
            user_id: act.actor_id?._id,
            full_name: act.actor_id?.full_name,
            avatar_url: act.actor_id?.avatar
        },
        created_at: act.created_at,
        action: act.action,
        source_type: act.source
    }));

    return {
        activities: formattedActivities,
        page,
        size,
        totalElements,
        totalPages: Math.ceil(totalElements / size),
        hasNext: (page + 1) * size < totalElements,
        hasPrevious: page > 0
    };
};