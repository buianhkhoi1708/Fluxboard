const Project = require('../../project/models/project.model');
const ProjectMember = require('../../projectMember/models/projectMember.model'); 

const Board = require('../../board/models/board.model'); 
const Role = require('../../rbac/models/role.model'); 
const { Roles, Scopes } = require('../../rbac/constants/rbac.enum'); 
const AppError = require('../../../common/exceptions/AppError'); 

exports.createProject = async (ownerId, projectData) => {
    const project = await Project.create({ ...projectData, owner_id: ownerId }); 
    
    const adminRole = await Role.findOne({ name: Roles.PM, scope: Scopes.PROJECT }).lean();
    if (!adminRole) throw new AppError('The PM role is not yet present. Please run the RBAC seed file!', 500);

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
            .populate('role_id', 'name') 
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
    const project = await Project.findByIdAndDelete(projectId);
    if (!project) throw new AppError('Project not found', 404, 'NOT_FOUND');
    
    // Khi xóa Project, xóa luôn các Member và Board liên quan
    await ProjectMember.deleteMany({ project_id: projectId });
    await Board.deleteMany({ project_id: projectId });
    
    return project;
};