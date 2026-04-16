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