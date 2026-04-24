const projectService = require('../services/project.service');

exports.createProject = async (req, res, next) => {
    try {
        const project = await projectService.createProject(req.user.id, req.body);
        res.status(201).json({ success: true, data: project });
    } catch (error) { next(error); }
};

exports.getUserProjects = async (req, res, next) => {
    try {
        const projects = await projectService.getUserProjects(req.user.id);
        res.status(200).json({ success: true, data: projects });
    } catch (error) { next(error); }
};

exports.getProjectDetail = async (req, res, next) => {
    try {
        const project = await projectService.getProjectDetail(req.params.id);
        res.status(200).json({ success: true, data: project });
    } catch (error) { next(error); }
};

exports.updateProject = async (req, res, next) => {
    try {
        const project = await projectService.updateProject(req.params.id, req.body);
        res.status(200).json({ success: true, data: project });
    } catch (error) { next(error); }
};

exports.deleteProject = async (req, res, next) => {
    try {
        await projectService.deleteProject(req.params.id);
        res.status(200).json({ success: true, message: 'Project deleted' });
    } catch (error) { next(error); }
};