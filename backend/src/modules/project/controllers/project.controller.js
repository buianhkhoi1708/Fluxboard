const projectService = require("../services/project.service");
const projectTeamService = require("../services/projectTeam.service");
const AppError = require("../../../common/exceptions/AppError");

exports.createProject = async (req, res, next) => {
  try {
    const project = await projectService.createProject(req.user.id, req.body);

    res.status(201).json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error("💥 CREATE PROJECT ERROR:", error);
    next(error);
  }
};

exports.getUserProjects = async (req, res, next) => {
  try {
    const projects = await projectService.getUserProjects(
      req.user.id,
      req.user,
    );

    res.status(200).json({
      success: true,
      data: projects,
      content: projects,
      last: true,
    });
  } catch (error) {
    next(error);
  }
};

exports.getProjectDetail = async (req, res, next) => {
  try {
    const project = await projectService.getProjectDetail(
      req.params.id,
      req.user,
    );

    res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateProject = async (req, res, next) => {
  try {
    const project = await projectService.updateProject(req.params.id, req.body);

    res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteProject = async (req, res, next) => {
  try {
    await projectService.deleteProject(req.params.id);

    res.status(200).json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

exports.assignProjectToTeam = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const { team_id, default_role } = req.body;

    if (!team_id) {
      throw new AppError("team_id is required", 400);
    }

    const result = await projectTeamService.assignProjectToTeam(
      projectId,
      team_id,
      default_role,
    );

    res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

exports.addMemberToProject = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const { user_id, role_ids } = req.body;

    if (!user_id) {
      throw new AppError("user_id is required", 400);
    }

    const result = await projectService.addMemberToProject(
      projectId,
      user_id,
      role_ids || [],
      req.user,
    );

    res.status(200).json({
      success: true,
      message: "Đã thêm thành viên vào dự án",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

exports.getOverviews = async (req, res, next) => {
  try {
    const projects = await projectService.getUserProjects(
      req.user.id,
      req.user,
    );

    res.status(200).json({
      success: true,
      data: projects,
      content: projects,
      last: true,
    });
  } catch (error) {
    next(error);
  }
};
