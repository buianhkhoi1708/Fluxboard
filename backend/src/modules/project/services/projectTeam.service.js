const Project = require('../models/project.model'); 
const Role = require('../../rbac/models/role.model');
const User = require('../../user/models/user.model'); 
const { Roles, Scopes } = require('../../rbac/constants/rbac.enum'); 
const AppError = require('../../../common/exceptions/AppError'); 
const mongoose = require('mongoose');

const PROJECT_MEMBERS_COLLECTION = 'project_members';

const toSafeIdArray = (id) => {
    if (!id) return [];
    const idStr = id.toString();
    const arr = [idStr];
    if (mongoose.Types.ObjectId.isValid(idStr)) {
        arr.push(new mongoose.Types.ObjectId(idStr));
    }
    return arr;
};

exports.assignProjectToTeam = async (projectId, teamId, defaultRoleName = Roles.MEMBER) => {
    const projectIdStr = projectId.toString();
    
    const project = await Project.findOne({ _id: { $in: toSafeIdArray(projectId) }, is_deleted: false }).lean();
    if (!project) throw new AppError('Project entity context not found', 404, 'NOT_FOUND');

    const role = await Role.findOne({ name: defaultRoleName, scope: Scopes.PROJECT }).lean();
    if (!role) throw new AppError(`Target constraint role metadata error: ${defaultRoleName}`, 500, 'INTERNAL_SERVER_ERROR');

    const usersInTeam = await User.find({ team_id: teamId.toString(), status: 'ACTIVE' }).select('_id').lean();
    if (usersInTeam.length === 0) return { message: 'No active resource users discovered inside this organizational group' };

    // Tìm kiếm các thành viên đã tồn tại bằng bảng chuẩn project_members
    const existingMembers = await mongoose.connection.db
        .collection(PROJECT_MEMBERS_COLLECTION)
        .find({ project_id: projectIdStr, is_deleted: false })
        .toArray();
        
    const existingUserIds = existingMembers.map(m => m.user_id.toString());
    const newUsersToAssign = usersInTeam.filter(u => !existingUserIds.includes(u._id.toString()));

    if (newUsersToAssign.length === 0) return { message: 'All target group members already allocated within this workplace project' };

    const memberAssignments = newUsersToAssign.map(user => ({
        project_id: projectIdStr,
        user_id: user._id.toString(),
        role_ids: [role._id.toString()], // Đồng bộ chuẩn cấu trúc dạng mảng của Java
        is_active: true,
        is_deleted: false,
        created_at: new Date(),
        updated_at: new Date()
    }));

    await mongoose.connection.db.collection(PROJECT_MEMBERS_COLLECTION).insertMany(memberAssignments);

    return { message: `Successfully allocated ${memberAssignments.length} operational members to project workspace` };
};