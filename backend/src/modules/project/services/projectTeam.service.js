const Project = require('../models/project.model'); 
const ProjectMember = require('../../projectMember/models/projectMember.model'); 
const Role = require('../../rbac/models/role.model');
const User = require('../../user/models/user.model'); 
const { Roles, Scopes } = require('../../rbac/constants/rbac.enum'); 
const AppError = require('../../../common/exceptions/AppError'); 

exports.assignProjectToTeam = async (projectId, teamId, defaultRoleName = Roles.MEMBER) => {
    // Kiểm tra Project
    const project = await Project.findById(projectId).lean();
    if (!project) throw new AppError('Project not found', 404, 'NOT_FOUND');

    // Tìm Role mặc định
    const role = await Role.findOne({ name: defaultRoleName, scope: Scopes.PROJECT }).lean();
    if (!role) throw new AppError(`Role ${defaultRoleName} not found`, 500);

    // Lấy User thuộc Team
    const usersInTeam = await User.find({ team_id: teamId, status: 'ACTIVE' }).select('_id').lean();
    if (usersInTeam.length === 0) return { message: 'No active users found in this team to assign' };

    // Lọc User chưa có trong Project
    const existingMembers = await ProjectMember.find({ project_id: projectId }).select('user_id').lean();
    const existingUserIds = existingMembers.map(m => m.user_id.toString());
    
    const newUsersToAssign = usersInTeam.filter(u => !existingUserIds.includes(u._id.toString()));

    if (newUsersToAssign.length === 0) return { message: 'All team members are already in the project' };

    // Gán dữ liệu
    const memberAssignments = newUsersToAssign.map(user => ({
        project_id: projectId,
        user_id: user._id,
        role_id: role._id
    }));

    await ProjectMember.insertMany(memberAssignments, { ordered: false });
    
    return { 
        message: `Successfully assigned ${memberAssignments.length} team members to the project`,
        assigned_count: memberAssignments.length 
    };
};