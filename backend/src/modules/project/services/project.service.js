const Project = require('../models/project.model'); 
const ProjectMember = require('../../projectMember/models/projectMember.model'); 
const Board = require('../../board/models/board.model'); 
const Role = require('../../rbac/models/role.model'); // Import thêm Role
const { Roles, Scopes } = require('../../rbac/constants/rbac.enum'); // Import hằng số
const AppError = require('../../../common/exceptions/AppError'); 

exports.createProject = async (ownerId, projectData) => {
    // 1. Tạo Project mới[cite: 6]
    const project = await Project.create({ ...projectData, owner_id: ownerId }); 
    
    // 2. Tìm động ID của chức danh PM trong DB
    const adminRole = await Role.findOne({ name: Roles.PM, scope: Scopes.PROJECT }).lean();
    if (!adminRole) {
        throw new AppError('The PM role is not yet present. Please run the RBAC seed file!', 500);
    }

    // 3. Lưu role_id thay vì lưu chữ 'MANAGER'[cite: 6]
    await ProjectMember.create({ 
        project_id: project._id, 
        user_id: ownerId, 
        role_id: adminRole._id 
    });

    return project; 
};

exports.getUserProjects = async (userId) => {
    const memberships = await ProjectMember.find({ user_id: userId }).select('project_id').lean(); 
    const projectIds = memberships.map(m => m.project_id); 
    return await Project.find({ _id: { $in: projectIds } }).lean(); 
};

exports.getProjectDetail = async (projectId) => {
    const project = await Project.findById(projectId).lean(); 
    if (!project) throw new AppError('Project not found', 404, 'NOT_FOUND'); 

    const [boards, members] = await Promise.all([ 
        Board.find({ project_id: projectId }).select('_id name description created_at').lean(), 
        ProjectMember.find({ project_id: projectId }) 
            .populate('user_id', 'full_name email avatar_url') 
            .populate('role_id', 'name') // Lấy tên Role hiển thị ra ngoài cho Frontend
            .lean()
    ]);

    project.boards = boards; 
    project.members = members; 
    return project; 
};

exports.updateProject = async (projectId, updateData) => {
    const project = await Project.findByIdAndUpdate(projectId, updateData, { new: true }).lean(); 
    if (!project) throw new AppError('Project not found', 404, 'NOT_FOUND'); 
    return project; 
};

exports.deleteProject = async (projectId) => {
    await Promise.all([ 
        Project.findByIdAndDelete(projectId), 
        ProjectMember.deleteMany({ project_id: projectId }), 
        Board.deleteMany({ project_id: projectId })  
    ]);
    return true; 
};