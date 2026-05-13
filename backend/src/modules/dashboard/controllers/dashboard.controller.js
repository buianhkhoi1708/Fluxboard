const dashboardService = require('../services/dashboard.service');

exports.getDashboardMetrics = async (req, res, next) => {
    try {
        // req.user đã được giải mã và chứa đầy đủ thông tin từ token (nhờ auth.service mới)
        const user = req.user;
        const queryParams = req.query;

        // Gọi thẳng xuống Service chung, để Service tự phân luồng theo Role
        const data = await dashboardService.getMetricsByRole(user, queryParams);

        // Trả về đúng format Mock Data của sếp
        res.status(200).json({ 
            success: true, 
            code: 'SUCCESS',
            data: data 
        });
    } catch (error) { 
        next(error); 
    }
};