const organizationService = require("../services/organization.service");

const toBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  if (typeof value === "boolean") {
    return value;
  }

  return ["true", "1", "yes", "y"].includes(String(value).toLowerCase());
};

const getVisibilityOptions = (req) => ({
  actorUser: req.user,
  excludeSystemAdmin: toBoolean(req.query.exclude_system_admin, true),
  includeCurrentSystemAdmin: toBoolean(
    req.query.include_current_system_admin,
    false,
  ),
});

exports.getTree = async (req, res, next) => {
  try {
    const treeData = await organizationService.getOrganizationTree(
      getVisibilityOptions(req),
    );

    res.status(200).json({
      success: true,
      data: treeData,
    });
  } catch (error) {
    next(error);
  }
};

exports.createDepartment = async (req, res, next) => {
  try {
    const newDept = await organizationService.createDepartment(
      req.body,
      req.user,
    );

    res.status(201).json({
      success: true,
      data: newDept,
      message: "Tạo phòng ban thành công",
    });
  } catch (error) {
    next(error);
  }
};

exports.updateDepartment = async (req, res, next) => {
  try {
    const updatedDept = await organizationService.updateDepartment(
      req.params.id,
      req.body,
      req.user,
    );

    res.status(200).json({
      success: true,
      data: updatedDept,
      message: "Cập nhật thành công",
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteDepartment = async (req, res, next) => {
  try {
    await organizationService.deleteDepartment(req.params.id);

    res.status(200).json({
      success: true,
      message: "Đã xóa phòng ban",
    });
  } catch (error) {
    next(error);
  }
};

exports.createTeam = async (req, res, next) => {
  try {
    const newTeam = await organizationService.createTeam(req.body, req.user);

    res.status(201).json({
      success: true,
      data: newTeam,
      message: "Tạo nhóm thành công",
    });
  } catch (error) {
    next(error);
  }
};

exports.updateTeam = async (req, res, next) => {
  try {
    const updatedTeam = await organizationService.updateTeam(
      req.params.teamId,
      req.body,
      req.user,
    );

    res.status(200).json({
      success: true,
      data: updatedTeam,
      message: "Cập nhật nhóm thành công",
    });
  } catch (error) {
    next(error);
  }
};

exports.getUnassignedUsers = async (req, res, next) => {
  try {
    const users = await organizationService.getUnassignedUsers(
      getVisibilityOptions(req),
    );

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

exports.assignToTeam = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const { user_id, department_id } = req.body;

    await organizationService.assignUserToTeam(
      user_id,
      teamId,
      department_id,
      req.user,
    );

    res.status(200).json({
      success: true,
      message: "Đã thêm nhân sự vào nhóm",
    });
  } catch (error) {
    next(error);
  }
};

exports.removeUserFromTeam = async (req, res, next) => {
  try {
    const { teamId, userId } = req.params;

    await organizationService.removeUserFromTeam(userId, teamId, req.user);

    res.status(200).json({
      success: true,
      message: "Đã xóa nhân sự khỏi nhóm",
    });
  } catch (error) {
    next(error);
  }
};

exports.searchUsers = async (req, res, next) => {
  try {
    const keyword = req.query.keyword ? String(req.query.keyword) : "";

    const users = await organizationService.searchUsers(
      keyword,
      getVisibilityOptions(req),
    );

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};
