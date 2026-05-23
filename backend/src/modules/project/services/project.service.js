const Project = require('../models/project.model'); 
const ProjectMember = require('../../projectMember/models/projectMember.model'); 
const Board = require('../../board/models/board.model'); 
const Role = require('../../rbac/models/role.model');
const User = require('../../user/models/user.model');
const { Roles, Scopes } = require('../../rbac/constants/rbac.enum'); 
const AppError = require('../../../common/exceptions/AppError'); 
const boardService = require('../../board/services/board.service');
const mongoose = require('mongoose');

exports.createProject = async (ownerId, projectData) => {
    const project = await Project.create({ ...projectData, owner_id: ownerId, is_deleted: false }); 
    
    const adminRole = await Role.findOne({ name: Roles.PM, scope: Scopes.PROJECT }).lean();
    if (!adminRole) {
        throw new AppError('The PM role is not yet present. Please run the RBAC seed file!', 500);
    }

    await ProjectMember.create({ 
        project_id: project._id, 
        user_id: ownerId, 
        role_ids: [adminRole._id], 
        is_deleted: false
    });

    return project; 
};

exports.getUserProjects = async (userId) => {
    // Giải quyết lỗi Data Type Mismatch: Tạo mảng chứa cả dạng String và ObjectId của userId
    const ownerIds = [userId];
    if (mongoose.Types.ObjectId.isValid(userId)) {
        ownerIds.push(new mongoose.Types.ObjectId(userId));
    }

    const memberships = await ProjectMember.find({ user_id: userId, is_deleted: { $ne: true } }).select('project_id').lean(); 
    const projectIds = memberships.map(m => m.project_id); 
    
    // Quét toàn bộ bản ghi bằng toán tử $ne (phòng trường hợp khuyết trường is_deleted trong db)
    const projects = await Project.find({ 
        $or: [
            { owner_id: { $in: ownerIds } }, // Khớp cả dạng String lẫn ObjectId
            { _id: { $in: projectIds } }
        ],
        is_deleted: { $ne: true } 
    }).sort({ created_at: -1 }).lean(); 

    // Trả về cấu trúc phẳng (Flat Array) đính kèm thuộc tính để tương thích hoàn toàn với map() của FE cũ
    const flatProjectsData = await Promise.all(projects.map(async (project) => {
        const [boards, members] = await Promise.all([
            Board.find({ project_id: project._id, is_deleted: { $ne: true } }).select('_id name description created_at').lean(),
            ProjectMember.find({ project_id: project._id, is_deleted: { $ne: true } })
                .populate('user_id', 'full_name email avatar_url')
                .populate('role_ids', 'name')
                .lean()
        ]);

        // Đính kèm trực tiếp vào object project, trả về mảng phẳng theo đúng ước định của useProjectStore.ts
        return {
            ...project,
            id: project._id.toString(),
            boards: boards,
            members: members
        };
    }));

    return flatProjectsData;
};

exports.getProjectDetail = async (projectId) => {
    const project = await Project.findById(projectId).lean(); 
    if (!project || project.is_deleted === true) throw new AppError('Project not found', 404, 'NOT_FOUND'); 

    const [boards, members] = await Promise.all([ 
        Board.find({ project_id: projectId, is_deleted: { $ne: true } }).select('_id name description created_at').lean(), 
        ProjectMember.find({ project_id: projectId, is_deleted: { $ne: true } }) 
            .populate('user_id', 'full_name email avatar_url') 
            .populate('role_ids', 'name')
            .lean()
    ]);

    project.boards = boards; 
    project.members = members; 
    return project; 
};

exports.updateProject = async (projectId, updateData) => {
    const project = await Project.findByIdAndUpdate(projectId, updateData, { new: true }).lean(); 
    if (!project || project.is_deleted === true) throw new AppError('Project not found', 404, 'NOT_FOUND'); 
    return project; 
};

exports.deleteProject = async (projectId) => {
    const project = await Project.findByIdAndUpdate(projectId, { is_deleted: true }, { new: true }).lean(); 
    if (!project) throw new AppError('Project not found', 404, 'NOT_FOUND'); 

    await ProjectMember.updateMany({ project_id: projectId }, { $set: { is_deleted: true, is_active: false } });

    const boards = await Board.find({ project_id: projectId, is_deleted: { $ne: true } }).select('_id').lean();
    for (const b of boards) {
        await boardService.deleteBoard(b._id);
    }

    return true; 
};

exports.addMemberToProject = async (projectId, userId, roleIds = []) => {
    // 1. Kiểm tra Dự án có tồn tại không
    const project = await Project.findById(projectId).lean();
    if (!project || project.is_deleted === true) {
        throw new AppError('Dự án không tồn tại hoặc đã bị xóa', 404, 'NOT_FOUND');
    }

    // 2. Kiểm tra User có tồn tại không
    const user = await User.findById(userId).lean();
    if (!user) {
        throw new AppError('Nhân sự không tồn tại', 404, 'NOT_FOUND');
    }

    // 3. Xử lý quyền (Role). Nếu mảng roleIds rỗng, tự động cấp quyền MEMBER mặc định
    let finalRoleIds = roleIds;
    if (!finalRoleIds || finalRoleIds.length === 0) {
        const defaultRole = await Role.findOne({ name: Roles.MEMBER, scope: Scopes.PROJECT }).lean();
        if (defaultRole) {
            finalRoleIds = [defaultRole._id];
        }
    }

    // 4. Kiểm tra xem người này đã ở trong dự án chưa
    const existingMember = await ProjectMember.findOne({ project_id: projectId, user_id: userId });

    if (existingMember) {
        // Nếu đã ở trong dự án rồi và chưa bị xóa -> Bỏ qua, không lỗi, trả về luôn
        if (existingMember.is_deleted === false) {
            return existingMember; 
        } 
        // Nếu trước đó bị đuổi (is_deleted: true) -> Khôi phục lại
        else {
            existingMember.is_deleted = false;
            existingMember.role_ids = finalRoleIds;
            await existingMember.save();
            return existingMember;
        }
    }

    // 5. Nếu chưa từng ở trong dự án -> Tạo bản ghi mới
    const newMember = await ProjectMember.create({
        project_id: projectId,
        user_id: userId,
        role_ids: finalRoleIds,
        is_deleted: false
    });

    return newMember;
};