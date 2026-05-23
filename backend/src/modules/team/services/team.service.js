const Team = require('../models/team.model');
const AppError = require('../../../common/exceptions/AppError');
const User = require('../../user/models/user.model');

exports.createTeam = async (data) => {
    const existing = await Team.findOne({ code: data.code });
    if (existing) throw new AppError('Team code already exists', 400, 'DUPLICATE_CODE');
    return await Team.create(data);
};

exports.getTeamsByDepartment = async (departmentId) => {
    try {
        // 1. Lấy danh sách teams
        const teams = await Team.find({ department_id: departmentId, is_deleted: false })
            .populate('lead_id', '_id full_name email avatar_url')
            .lean(); 
            
        // 2. Gắn thêm Members
        for (let team of teams) {
            const members = await User.find({ 
                team_id: team._id, 
                status: { $regex: /^active$/i } 
            }).select('_id full_name email avatar_url').lean();
            
            if (team.lead_id) {
                const isLeadInMembers = members.some(m => m._id.toString() === team.lead_id._id.toString());
                if (!isLeadInMembers) {
                    members.unshift(team.lead_id);
                }
            }
            
            team.members = members; 
        }

        return teams; // Trả dữ liệu về cho Controller
    } catch (error) { 
        throw error; // Quăng lỗi lên cho Controller chụp
    }
};