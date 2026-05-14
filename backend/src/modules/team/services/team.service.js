const Team = require('../models/team.model');
const AppError = require('../../../common/exceptions/AppError');

exports.createTeam = async (data) => {
    const existing = await Team.findOne({ code: data.code });
    if (existing) throw new AppError('Team code already exists', 400, 'DUPLICATE_CODE');
    return await Team.create(data);
};

exports.getTeamsByDepartment = async (departmentId) => {
    return await Team.find({ department_id: departmentId, is_deleted: false })
        .populate('lead_id', 'full_name email avatar_url')
        .lean();
};