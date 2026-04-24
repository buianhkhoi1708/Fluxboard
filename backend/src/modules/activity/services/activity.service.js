const Activity = require('../models/activity.model');

exports.logActivity = async (data) => {
    try {
        await Activity.create(data);
    } catch (error) {
        console.error('Failed to log activity:', error);
    }
};

exports.getProjectActivities = async (projectId, page = 1, limit = 20) => {
    const skip = (page - 1) * limit;
    return await Activity.find({ project_id: projectId })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .populate('actor_id', 'full_name avatar_url')
        .lean();
};