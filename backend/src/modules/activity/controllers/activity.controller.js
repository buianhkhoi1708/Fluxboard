const activityService = require('../services/activity.service');

exports.getProjectActivities = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        
        const activities = await activityService.getProjectActivities(projectId, page, limit);
        res.status(200).json({ success: true, data: activities });
    } catch (error) { next(error); }
};