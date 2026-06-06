const userService = require("../services/user.service");

const toBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  if (typeof value === "boolean") {
    return value;
  }

  return ["true", "1", "yes", "y"].includes(String(value).toLowerCase());
};

const toPositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
};

exports.getUserById = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id, req.user?.id);

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

exports.createUser = async (req, res, next) => {
  try {
    const newUser = await userService.createUser(req.body, req.user?.id);

    res.status(201).json({
      success: true,
      data: newUser,
      message: "Account created successfully",
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllUsers = async (req, res, next) => {
  try {
    const {
      page = 0,
      size = 100,
      search = "",
      exclude_system_admin,
      include_current_system_admin,
      include_role,
      include_session,
    } = req.query;

    const result = await userService.getAllUsers({
      page: toPositiveInteger(page, 0),
      size: toPositiveInteger(size, 100),
      search,
      actorId: req.user?.id,
      excludeSystemAdmin: toBoolean(exclude_system_admin, false),
      includeCurrentSystemAdmin: toBoolean(include_current_system_admin, false),
      includeRole: toBoolean(include_role, true),
      includeSession: toBoolean(include_session, true),
    });

    res.status(200).json({
      success: true,
      code: "SUCCESS",
      data: result.users,
      meta: {
        page: result.page,
        size: result.size,
        total_elements: result.totalElements,
        total_pages: result.totalPages,
        has_next: result.hasNext,
        has_previous: result.page > 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getUnassignedUsers = async (req, res, next) => {
  try {
    const users = await userService.getUnassignedUsers({
      actorId: req.user?.id,
      excludeSystemAdmin: toBoolean(req.query.exclude_system_admin, true),
      includeCurrentSystemAdmin: toBoolean(
        req.query.include_current_system_admin,
        false,
      ),
    });

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
    const { team_id } = req.body;

    if (!team_id) {
      return res.status(400).json({
        success: false,
        message: "Missing team_id",
      });
    }

    const user = await userService.assignTeam(
      req.params.id,
      team_id,
      req.user?.id,
    );

    res.status(200).json({
      success: true,
      data: user,
      message: "User assigned to team successfully",
    });
  } catch (error) {
    next(error);
  }
};

exports.revokeAccess = async (req, res, next) => {
  try {
    const result = await userService.revokeAccess(req.params.id, req.user?.id);

    res.status(200).json({
      success: true,
      data: result,
      message: "User access revoked successfully",
    });
  } catch (error) {
    next(error);
  }
};
