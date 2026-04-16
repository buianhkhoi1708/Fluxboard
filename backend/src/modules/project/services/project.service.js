const Project = require('../models/project.model');
const ProjectMember = require('../models/projectMember.model');

exports.createProject = async (ownerId, projectData) => {
    const project = await Project.create({ ...projectData, owner_id: ownerId });
    await ProjectMember.create({ project_id: project._id, user_id: ownerId, role: 'MANAGER' });
    return project;
};

exports.getUserProjects = async (userId) => {
    const memberships = await ProjectMember.find({ user_id: userId }).select('project_id').lean();
    const projectIds = memberships.map(m => m.project_id);
    return await Project.find({ _id: { $in: projectIds } }).lean();
};