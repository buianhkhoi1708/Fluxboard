const dashboardService = require('../services/dashboard.service');

exports.getDashboardData = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const data = await dashboardService.getMemberDashboard(userId);
        res.status(200).json({ success: true, data });
    } catch (error) { next(error); }
};