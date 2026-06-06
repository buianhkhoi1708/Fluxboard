const ProjectMember = require("../models/projectMember.model");
const Role = require("../../rbac/models/role.model");
const User = require("../../user/models/user.model");
const AppError = require("../../../common/exceptions/AppError");
const eventBus = require("../../../common/utils/eventBus");
const mongoose = require("mongoose");
const { Roles, Scopes } = require("../../rbac/constants/rbac.enum");

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
      "SYSTEM_ADMIN là tài khoản quản trị cao nhất và không thể bị thêm/sửa/xóa khỏi dự án bởi tài khoản khác.",
      403,
      "SYSTEM_ADMIN_PROTECTED",
    );
  }

  return {
    targetUser,
    context,
  };
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

const formatMember = (member) => {
  const user = member.user_id;

  return {
    id: user?._id || member.user_id,
    _id: user?._id || member.user_id,
    user_id: user || member.user_id,
    member_record_id: member._id,

    full_name: user?.full_name,
    fullName: user?.full_name,
    email: user?.email,
    avatar_url: user?.avatar_url,
    avatarUrl: user?.avatar_url,

    role_id: user?.role_id || null,
    role_name: getRoleNameFromValue(user) || "UNKNOWN_ROLE",
    system_role: getRoleNameFromValue(user) || "UNKNOWN_ROLE",

    is_active: member.is_active,
    role_ids: member.role_ids,
    joined_at: member.created_at,
  };
};

exports.getMembers = async (projectId, actorUser) => {
  const context = await buildVisibilityContext(actorUser);

  const members = await ProjectMember.find({
    project_id: projectId,
    is_deleted: false,
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
    .sort({ created_at: 1 })
    .lean();

  return members
    .filter((member) => shouldExposeUser(member.user_id, context))
    .map(formatMember);
};

exports.addMember = async (projectId, payload, actorUser) => {
  const { user_id } = payload;
  const role_ids = await validateProjectRoleIds(payload.role_ids);

  if (!mongoose.Types.ObjectId.isValid(String(projectId))) {
    throw new AppError("Project id không hợp lệ.", 400, "INVALID_PROJECT_ID");
  }

  if (!user_id) {
    throw new AppError("user_id is required", 400, "BAD_REQUEST");
  }

  await assertTargetUserAllowed(user_id, actorUser);

  const existingMember = await ProjectMember.findOne({
    project_id: projectId,
    user_id,
  });

  let member;

  if (existingMember && !existingMember.is_deleted) {
    throw new AppError(
      "This user is already a member of the project.",
      400,
      "BAD_REQUEST",
    );
  }

  if (existingMember && existingMember.is_deleted) {
    existingMember.is_deleted = false;
    existingMember.is_active = true;
    existingMember.role_ids = role_ids;
    member = await existingMember.save();
  } else {
    member = await ProjectMember.create({
      project_id: projectId,
      user_id,
      role_ids,
    });
  }

  eventBus.emit("activity_log", {
    actor_user_id: actorUser.id || actorUser._id || actorUser.user_id,
    source_type: "PROJECT",
    source_id: projectId,
    project_id: projectId,
    action: "ADD_MEMBER",
    message: "A new member has been added to the project.",
  });

  return member;
};

exports.updateMember = async (projectId, userId, payload, actorUser) => {
  await assertTargetUserAllowed(userId, actorUser);

  const member = await ProjectMember.findOne({
    project_id: projectId,
    user_id: userId,
    is_deleted: false,
  });

  if (!member) {
    throw new AppError("Project member not found.", 404, "NOT_FOUND");
  }

  let isRoleChanged = false;

  if (payload.role_ids !== undefined) {
    member.role_ids = await validateProjectRoleIds(payload.role_ids);
    isRoleChanged = true;
  }

  if (payload.is_active !== undefined) {
    member.is_active = payload.is_active;
    isRoleChanged = true;
  }

  await member.save();

  eventBus.emit("activity_log", {
    actor_user_id: actorUser.id || actorUser._id || actorUser.user_id,
    source_type: "PROJECT",
    source_id: projectId,
    project_id: projectId,
    action: "UPDATE_MEMBER",
    message: "Member permissions or status have been updated.",
  });

  if (isRoleChanged) {
    eventBus.emit("force_logout_user", {
      userId,
      message:
        "Your project permissions have changed. Please log in again to sync updates!",
    });
  }

  return member;
};

exports.removeMember = async (projectId, userId, actorUser) => {
  await assertTargetUserAllowed(userId, actorUser);

  const member = await ProjectMember.findOne({
    project_id: projectId,
    user_id,
    is_deleted: false,
  });

  if (!member) {
    throw new AppError("Project member not found.", 404, "NOT_FOUND");
  }

  const adminRole = await Role.findOne({
    name: Roles.PM,
    scope: Scopes.PROJECT,
  }).lean();

  if (
    adminRole &&
    member.role_ids.some((roleId) => String(roleId) === String(adminRole._id))
  ) {
    const adminCount = await ProjectMember.countDocuments({
      project_id: projectId,
      is_deleted: false,
      role_ids: {
        $in: [adminRole._id],
      },
    });

    if (adminCount <= 1) {
      throw new AppError(
        "Cannot remove the last Project Manager from this project.",
        400,
        "BAD_REQUEST",
      );
    }
  }

  member.is_deleted = true;
  member.is_active = false;

  await member.save();

  eventBus.emit("activity_log", {
    actor_user_id: actorUser.id || actorUser._id || actorUser.user_id,
    source_type: "PROJECT",
    source_id: projectId,
    project_id: projectId,
    action: "REMOVE_MEMBER",
    message: "A member has been removed from the project.",
  });

  eventBus.emit("project_access_removed", {
    userId,
    projectId,
    message: "Your access to this project has been revoked.",
  });

  return true;
};
