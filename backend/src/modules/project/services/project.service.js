const Project = require('../models/project.model'); 
const ProjectMember = require('../../projectMember/models/projectMember.model'); 
const Board = require('../../board/models/board.model'); 
const Role = require('../../rbac/models/role.model');
const { Roles, Scopes } = require('../../rbac/constants/rbac.enum'); 
const AppError = require('../../../common/exceptions/AppError'); 
const boardService = require('../../board/services/board.service');

exports.createProject = async (ownerId, projectData) => {
    const project = await Project.create({ ...projectData, owner_id: ownerId }); 
    
    const adminRole = await Role.findOne({ name: Roles.PM, scope: Scopes.PROJECT }).lean();
    if (!adminRole) {
        throw new AppError('The PM role is not yet present. Please run the RBAC seed file!', 500);
    }

    await ProjectMember.create({ 
        project_id: project._id, 
        user_id: ownerId, 
        role_id: adminRole._id 
    });

    return project; 
};

exports.getUserProjects = async (userId) => {
    const memberships = await ProjectMember.find({ user_id: userId, is_deleted: false }).select('project_id').lean(); 
    const projectIds = memberships.map(m => m.project_id); 
    return await Project.find({ _id: { $in: projectIds }, is_deleted: false }).lean(); 
};

exports.getProjectDetail = async (projectId) => {
    const project = await Project.findById(projectId).lean(); 
    if (!project || project.is_deleted) throw new AppError('Project not found', 404, 'NOT_FOUND'); 

    const [boards, members] = await Promise.all([ 
        Board.find({ project_id: projectId, is_deleted: false }).select('_id name description created_at').lean(), 
        ProjectMember.find({ project_id: projectId, is_deleted: false }) 
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
    if (!project || project.is_deleted) throw new AppError('Project not found', 404, 'NOT_FOUND'); 
    return project; 
};

exports.deleteProject = async (projectId) => {
    const project = await Project.findByIdAndUpdate(projectId, { is_deleted: true }, { new: true }).lean(); 
    if (!project) throw new AppError('Project not found', 404, 'NOT_FOUND'); 

    await ProjectMember.updateMany({ project_id: projectId }, { $set: { is_deleted: true, is_active: false } });

    const boards = await Board.find({ project_id: projectId, is_deleted: false }).select('_id').lean();
    for (const b of boards) {
        await boardService.deleteBoard(b._id);
    }

    return true; 
};