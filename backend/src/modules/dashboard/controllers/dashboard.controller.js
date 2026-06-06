const dashboardService = require("../services/dashboard.service");

exports.getDashboardMetrics = async (req, res, next) => {
  try {
    const user = req.user;
    const queryParams = req.query;

    const data = await dashboardService.getMetricsByRole(user, queryParams);

    res.status(200).json({
      success: true,
      code: "SUCCESS",
      data: data,
    });
  } catch (error) {
    next(error);
  }
};
