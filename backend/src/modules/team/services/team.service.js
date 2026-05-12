const AppError = require('../../../common/exceptions/AppError');

exports.createTeam = async (data) => {
    return await Team.create(data);
};

exports.getTeamsByDepartment = async (departmentId) => {
    return await Team.find({ department_id: departmentId })
        .populate('lead_id', 'full_name email avatar_url')
        .lean();
};