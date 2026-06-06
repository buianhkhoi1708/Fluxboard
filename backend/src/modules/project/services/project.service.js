const Project = require("../models/project.model");
const ProjectMember = require("../../projectMember/models/projectMember.model");
const Board = require("../../board/models/board.model");
const Role = require("../../rbac/models/role.model");
const User = require("../../user/models/user.model");
const { Roles, Scopes } = require("../../rbac/constants/rbac.enum");
const AppError = require("../../../common/exceptions/AppError");
const boardService = require("../../board/services/board.service");
const mongoose = require("mongoose");

const normalizeRoleName = (value) => {
  if (!value) return "";

  return String(value)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
};

const getUserId = (user) => {
  if (!user) return "";

  return String(user.user_id || user.id || user._id || "");
};

const getRoleNameFromValue = (value) => {
  if (!value) return "";

  const directRole =
    value.role_name ||
    value.roleName ||
    value.system_role ||
    value.systemRole ||
    value.role ||
    value.role_code ||
    value.roleCode;

  if (directRole) {
    return normalizeRoleName(directRole);
  }

  if (value.role_id && typeof value.role_id === "object") {
    return normalizeRoleName(value.role_id.name || value.role_id.code);
  }

  return "";
};

const isSystemAdminValue = (value) => {
  return getRoleNameFromValue(value) === "SYSTEM_ADMIN";
};

const getActorFromDb = async (actorUser) => {
  const actorId = getUserId(actorUser);

  if (!actorId) return null;

  return User.findById(actorId).populate("role_id", "name scope").lean();
};

const getSystemAdminRole = async () => {
  return Role.findOne({
    name: "SYSTEM_ADMIN",
  }).lean();
};

const buildVisibilityContext = async (actorUser) => {
  const actorFromDb = await getActorFromDb(actorUser);
  const actor = actorFromDb || actorUser || null;

  const actorIsSystemAdmin =
    isSystemAdminValue(actorUser) || isSystemAdminValue(actorFromDb);

  const systemAdminRole = await getSystemAdminRole();

  return {
    actor,
    actorId: getUserId(actor),
    actorIsSystemAdmin,
    systemAdminRoleId: systemAdminRole?._id
      ? String(systemAdminRole._id)
      : null,
  };
};

const isUserSystemAdminByRoleId = (user, context) => {
  if (!user || !context.systemAdminRoleId) {
    return false;
  }

  const roleId =
    typeof user.role_id === "object"
      ? user.role_id?._id || user.role_id?.id
      : user.role_id;

  return String(roleId || "") === context.systemAdminRoleId;
};

const shouldExposeUser = (user, context) => {
  if (!user) return false;

  const userIsSystemAdmin =
    isSystemAdminValue(user) || isUserSystemAdminByRoleId(user, context);

  if (!userIsSystemAdmin) {
    return true;
  }

  return (
    context.actorIsSystemAdmin &&
    String(getUserId(user)) === String(context.actorId)
  );
};

const sanitizeMembers = (members, context) => {
  if (!Array.isArray(members)) return [];

  return members.filter((member) => {
    const user =
      member.user_id && typeof member.user_id === "object"
        ? member.user_id
        : member.user;

    return shouldExposeUser(user, context);
  });
};

const assertTargetUserAllowed = async (targetUserId, actorUser) => {
  const context = await buildVisibilityContext(actorUser);

  const targetUser = await User.findById(targetUserId)
    .populate("role_id", "name scope")
    .lean();

  if (!targetUser) {
    throw new AppError("Nhân sự không tồn tại", 404, "USER_NOT_FOUND");
  }

  if (!shouldExposeUser(targetUser, context)) {
    throw new AppError(
      "SYSTEM_ADMIN là tài khoản quản trị cao nhất và không thể bị thêm vào dự án bởi tài khoản khác.",
      403,
      "SYSTEM_ADMIN_PROTECTED",
    );
  }

  return targetUser;
};

const validateProjectRoleIds = async (roleIds = []) => {
  let finalRoleIds = Array.isArray(roleIds) ? roleIds : [];

  if (finalRoleIds.length === 0) {
    const defaultRole = await Role.findOne({
      name: Roles.MEMBER,
      scope: Scopes.PROJECT,
    }).lean();

    if (defaultRole) {
      finalRoleIds = [defaultRole._id];
    }
  }

  if (finalRoleIds.length === 0) {
    return [];
  }

  const roles = await Role.find({
    _id: {
      $in: finalRoleIds,
    },
  }).lean();

  const hasSystemAdminRole = roles.some((role) => {
    return normalizeRoleName(role.name) === "SYSTEM_ADMIN";
  });

  if (hasSystemAdminRole) {
    throw new AppError(
      "Không được gán SYSTEM_ADMIN như một project role.",
      403,
      "SYSTEM_ADMIN_ROLE_PROTECTED",
    );
  }

  return finalRoleIds;
};

const getProjectMembers = async (projectId) => {
  return ProjectMember.find({
    project_id: projectId,
    is_deleted: {
      $ne: true,
    },
  })
    .populate({
      path: "user_id",
      select: "full_name email avatar_url role_id status",
      populate: {
        path: "role_id",
        select: "name scope",
      },
    })
    .populate("role_ids", "name scope")
    .lean();
};

exports.createProject = async (ownerId, projectData) => {
  const project = await Project.create({
    ...projectData,
    owner_id: ownerId,
    is_deleted: false,
  });

  const adminRole = await Role.findOne({
    name: Roles.PM,
    scope: Scopes.PROJECT,
  }).lean();

  if (!adminRole) {
    throw new AppError(
      "The PM role is not yet present. Please run the RBAC seed file!",
      500,
    );
  }

  await ProjectMember.create({
    project_id: project._id,
    user_id: ownerId,
    role_ids: [adminRole._id],
    is_deleted: false,
  });

  return project;
};

exports.getUserProjects = async (userId, actorUser = null) => {
  const context = await buildVisibilityContext(actorUser || { id: userId });

  const ownerIds = [userId];

  if (mongoose.Types.ObjectId.isValid(userId)) {
    ownerIds.push(new mongoose.Types.ObjectId(userId));
  }

  const memberships = await ProjectMember.find({
    user_id: userId,
    is_deleted: {
      $ne: true,
    },
  })
    .select("project_id")
    .lean();

  const projectIds = memberships.map((member) => member.project_id);

  const projects = await Project.find({
    $or: [
      {
        owner_id: {
          $in: ownerIds,
        },
      },
      {
        _id: {
          $in: projectIds,
        },
      },
    ],
    is_deleted: {
      $ne: true,
    },
  })
    .sort({
      created_at: -1,
    })
    .lean();

  return await Promise.all(
    projects.map(async (project) => {
      const [boards, members] = await Promise.all([
        Board.find({
          project_id: project._id,
          is_deleted: {
            $ne: true,
          },
        })
          .select("_id name description created_at")
          .lean(),

        getProjectMembers(project._id),
      ]);

      return {
        ...project,
        id: project._id.toString(),
        boards,
        members: sanitizeMembers(members, context),
      };
    }),
  );
};

exports.getProjectDetail = async (projectId, actorUser = null) => {
  const context = await buildVisibilityContext(actorUser);

  const project = await Project.findById(projectId).lean();

  if (!project || project.is_deleted === true) {
    throw new AppError("Project not found", 404, "NOT_FOUND");
  }

  const [boards, members] = await Promise.all([
    Board.find({
      project_id: projectId,
      is_deleted: {
        $ne: true,
      },
    })
      .select("_id name description created_at")
      .lean(),

    getProjectMembers(projectId),
  ]);

  project.boards = boards;
  project.members = sanitizeMembers(members, context);

  return project;
};

exports.updateProject = async (projectId, updateData) => {
  const project = await Project.findByIdAndUpdate(projectId, updateData, {
    new: true,
  }).lean();

  if (!project || project.is_deleted === true) {
    throw new AppError("Project not found", 404, "NOT_FOUND");
  }

  return project;
};

exports.deleteProject = async (projectId) => {
  const project = await Project.findByIdAndUpdate(
    projectId,
    {
      is_deleted: true,
    },
    {
      new: true,
    },
  ).lean();

  if (!project) {
    throw new AppError("Project not found", 404, "NOT_FOUND");
  }

  await ProjectMember.updateMany(
    {
      project_id: projectId,
    },
    {
      $set: {
        is_deleted: true,
        is_active: false,
      },
    },
  );

  const boards = await Board.find({
    project_id: projectId,
    is_deleted: {
      $ne: true,
    },
  })
    .select("_id")
    .lean();

  for (const board of boards) {
    await boardService.deleteBoard(board._id);
  }

  return true;
};

exports.addMemberToProject = async (
  projectId,
  userId,
  roleIds = [],
  actorUser = null,
) => {
  const project = await Project.findById(projectId).lean();

  if (!project || project.is_deleted === true) {
    throw new AppError("Dự án không tồn tại hoặc đã bị xóa", 404, "NOT_FOUND");
  }

  await assertTargetUserAllowed(userId, actorUser);

  const finalRoleIds = await validateProjectRoleIds(roleIds);

  const existingMember = await ProjectMember.findOne({
    project_id: projectId,
    user_id: userId,
  });

  if (existingMember) {
    if (existingMember.is_deleted === false) {
      return existingMember;
    }

    existingMember.is_deleted = false;
    existingMember.is_active = true;
    existingMember.role_ids = finalRoleIds;

    await existingMember.save();

    return existingMember;
  }

  return await ProjectMember.create({
    project_id: projectId,
    user_id: userId,
    role_ids: finalRoleIds,
    is_deleted: false,
  });
};
