const Activity = require('../models/activity.model');
const { paginate } = require('../../../common/utils/pagination.util');

exports.logActivity = async (data) => {
    try {
        await Activity.create(data);
    } catch (error) {
        console.error('Failed to log activity:', error);
    }
};

exports.getProjectActivities = async (projectId, page = 1, limit = 20) => {
    return await paginate(Activity, { project_id: projectId }, page, limit, 'actor_id');
};