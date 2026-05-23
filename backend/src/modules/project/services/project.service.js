const Project = require('../models/project.model'); 
const Role = require('../../rbac/models/role.model');
const User = require('../../user/models/user.model');
const { Roles, Scopes } = require('../../rbac/constants/rbac.enum'); 
const AppError = require('../../../common/exceptions/AppError'); 
const boardService = require('../../board/services/board.service');
const mongoose = require('mongoose');

// Định danh cứng bộ sưu tập thành viên chuẩn để triệt tiêu bảng rác 'projectmembers'
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

exports.createProject = async (ownerId, projectData) => {
    const normalizedData = {
        ...projectData,
        owner_id: ownerId.toString(),
        department_id: projectData.department_id ? projectData.department_id.toString() : null,
        is_deleted: false
    };

    const project = await Project.create(normalizedData);
    
    const adminRole = await Role.findOne({ name: Roles.PM, scope: Scopes.PROJECT }).lean();
    if (!adminRole) {
        throw new AppError('Default PM role configuration missing in system', 500, 'INTERNAL_SERVER_ERROR');
    }

    // Ghi nhận thành viên trực tiếp vào bộ sưu tập chuẩn project_members cấu trúc mảng role_ids
    await mongoose.connection.db.collection(PROJECT_MEMBERS_COLLECTION).insertOne({
        project_id: project._id.toString(),
        user_id: ownerId.toString(),
        role_ids: [adminRole._id.toString()],
        is_active: true,
        is_deleted: false,
        created_at: new Date(),
        updated_at: new Date()
    });

    return project; 
};

exports.getUserProjects = async (userId) => {
    const userIdStr = userId.toString();

    // 1. Tìm tất cả các dự án mà User là thành viên trong bảng project_members
    const memberships = await mongoose.connection.db
        .collection(PROJECT_MEMBERS_COLLECTION)
        .find({ user_id: userIdStr, is_deleted: false, is_active: true })
        .toArray();
        
    const joinedProjectIds = memberships.map(m => m.project_id.toString());

    // 2. Tìm các dự án do User làm chủ hoặc được tham gia vào
    const projects = await Project.find({
        $or: [
            { owner_id: userIdStr },
            { _id: { $in: joinedProjectIds.map(id => mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id) } }
        ],
        is_deleted: false
    }).lean();

    return projects;
};

exports.getProjectDetail = async (projectId) => {
    const safeProjectIds = toSafeIdArray(projectId);
    const project = await Project.findOne({ _id: { $in: safeProjectIds }, is_deleted: false }).lean(); 
    if (!project) {
        throw new AppError('Project target entity not found', 404, 'NOT_FOUND'); 
    }

    const projectIdStr = project._id.toString();

    // Thực hiện truy vấn song song tối ưu hóa phần cứng RAM/CPU
    const Board = require('../../board/models/board.model');
    const [boards, membersFlat] = await Promise.all([ 
        Board.find({ project_id: projectIdStr, is_deleted: { $ne: true } }).select('_id name description created_at').lean(), 
        mongoose.connection.db.collection(PROJECT_MEMBERS_COLLECTION)
            .find({ project_id: projectIdStr, is_deleted: false })
            .toArray()
    ]);

    // Populate thủ công thông tin chi tiết User và các Vai trò từ mảng role_ids liên kết lai Java
    const populatedMembers = await Promise.all(membersFlat.map(async (member) => {
        const userDoc = await User.findOne({ _id: { $in: toSafeIdArray(member.user_id) } })
            .select('full_name email avatar_url').lean();
            
        // Xử lý cả trường hợp phân quyền dạng đơn role_id hoặc mảng role_ids
        let targetRoleIds = member.role_ids || (member.role_id ? [member.role_id] : []);
        const rolesDocs = await Role.find({ 
            _id: { $in: targetRoleIds.map(id => mongoose.Types.ObjectId.isValid(id.toString()) ? new mongoose.Types.ObjectId(id.toString()) : id) } 
        }).select('name').lean();

        return {
            _id: member._id.toString(),
            project_id: projectIdStr,
            user_id: userDoc || { _id: member.user_id },
            role_ids: rolesDocs.map(r => ({ name: r.name })),
            is_active: member.is_active
        };
    }));

    project.boards = boards; 
    project.members = populatedMembers; 
    return project; 
};

exports.updateProject = async (projectId, updateData) => {
    const safeProjectIds = toSafeIdArray(projectId);
    const project = await Project.findOneAndUpdate(
        { _id: { $in: safeProjectIds }, is_deleted: false }, 
        { $set: updateData }, 
        { new: true }
    ).lean(); 
    
    if (!project) throw new AppError('Project target entity not found', 404, 'NOT_FOUND'); 
    return project; 
};

exports.deleteProject = async (projectId) => {
    const projectIdStr = projectId.toString();
    const safeProjectIds = toSafeIdArray(projectId);

    const project = await Project.findOneAndUpdate(
        { _id: { $in: safeProjectIds } }, 
        { $set: { is_deleted: true } }, 
        { new: true }
    ).lean(); 
    
    if (!project) throw new AppError('Project target entity not found', 404, 'NOT_FOUND'); 

    // Cascade xóa mềm toàn bộ thực thể liên đới trực tiếp trong hệ thống Node.js
    await mongoose.connection.db.collection(PROJECT_MEMBERS_COLLECTION)
        .updateMany({ project_id: projectIdStr }, { $set: { is_deleted: true } });
        
    const Board = require('../../board/models/board.model');
    const boards = await Board.find({ project_id: projectIdStr }).select('_id').lean();
    
    for (const b of boards) {
        await boardService.deleteBoard(b._id);
    }

    return true;
};