const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../models/user.model");
const Team = require("../../team/models/team.model");
const Role = require("../../rbac/models/role.model");
const UserSession = require("../../setting/models/userSession.model");

const activityService = require("../../activity/services/activity.service");
const eventBus = require("../../../common/utils/eventBus");
const AppError = require("../../../common/exceptions/AppError");

const ONLINE_WINDOW_MS = Number(process.env.ONLINE_WINDOW_MS || 5 * 60 * 1000);

const normalizeRoleName = (value) => {
  if (!value) return "";

  return String(value)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
};

const toObjectId = (value) => {
  if (!value) return null;

  const id =
    typeof value === "object" ? value._id || value.id || value.user_id : value;

  if (!mongoose.Types.ObjectId.isValid(String(id))) {
    return null;
  }

  return new mongoose.Types.ObjectId(String(id));
};

const getUserId = (user) => {
  if (!user) return "";

  return String(user.user_id || user.id || user._id || "");
};

const getRoleObject = (user) => {
  if (!user || !user.role_id) return null;

  return typeof user.role_id === "object" ? user.role_id : null;
};

const getRoleNameFromUser = (user) => {
  if (!user) return "";

  const directRole =
    user.role_name ||
    user.roleName ||
    user.system_role ||
    user.systemRole ||
    user.role ||
    user.role_code ||
    user.roleCode;

  if (directRole) {
    return normalizeRoleName(directRole);
  }

  const roleObject = getRoleObject(user);

  if (roleObject) {
    return normalizeRoleName(roleObject.name || roleObject.code);
  }

  return "";
};

const isSystemAdminUser = (user) => {
  return getRoleNameFromUser(user) === "SYSTEM_ADMIN";
};

const getSystemAdminRole = async () => {
  return Role.findOne({
    name: "SYSTEM_ADMIN",
  }).lean();
};

const getActor = async (actorId) => {
  const actorObjectId = toObjectId(actorId);

  if (!actorObjectId) return null;

  return User.findById(actorObjectId).populate("role_id", "name scope").lean();
};

const getActorVisibilityContext = async ({
  actorId,
  excludeSystemAdmin = false,
  includeCurrentSystemAdmin = false,
}) => {
  const actor = await getActor(actorId);
  const actorIsSystemAdmin = isSystemAdminUser(actor);

  const shouldHideSystemAdmin = !actorIsSystemAdmin || excludeSystemAdmin;

  return {
    actor,
    actorIsSystemAdmin,
    shouldHideSystemAdmin,
    includeCurrentSystemAdmin,
  };
};

const applySystemAdminVisibilityFilter = async (baseFilter, context) => {
  if (!context.shouldHideSystemAdmin) {
    return baseFilter;
  }

  const systemAdminRole = await getSystemAdminRole();

  if (!systemAdminRole?._id) {
    return baseFilter;
  }

  const roleFilter = {
    role_id: {
      $ne: systemAdminRole._id,
    },
  };

  if (
    context.actorIsSystemAdmin &&
    context.includeCurrentSystemAdmin &&
    context.actor?._id
  ) {
    return {
      $and: [
        baseFilter,
        {
          $or: [
            roleFilter,
            {
              _id: context.actor._id,
            },
          ],
        },
      ],
    };
  }

  return {
    $and: [baseFilter, roleFilter],
  };
};

const buildSearchFilter = (search) => {
  const keyword = String(search || "").trim();

  if (!keyword) {
    return {};
  }

  const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

  return {
    $or: [{ full_name: regex }, { email: regex }],
  };
};

const getSessionMap = async (users) => {
  const userIds = users
    .map((user) => toObjectId(user._id || user.id || user.user_id))
    .filter(Boolean);

  if (userIds.length === 0) {
    return new Map();
  }

  const rows = await UserSession.aggregate([
    {
      $match: {
        user_id: { $in: userIds },
        is_active: true,
      },
    },
    {
      $sort: {
        last_activity: -1,
      },
    },
    {
      $group: {
        _id: "$user_id",
        last_activity: { $first: "$last_activity" },
        active_sessions: { $sum: 1 },
      },
    },
  ]);

  const now = Date.now();
  const map = new Map();

  rows.forEach((row) => {
    const lastActivity = row.last_activity ? new Date(row.last_activity) : null;

    const isOnline =
      lastActivity && now - lastActivity.getTime() <= ONLINE_WINDOW_MS;

    map.set(String(row._id), {
      is_online: Boolean(isOnline),
      session_status: isOnline ? "ONLINE" : "OFFLINE",
      last_activity: lastActivity,
      active_sessions: row.active_sessions || 0,
    });
  });

  return map;
};

const normalizeUserForResponse = (user, sessionInfo = null) => {
  if (!user) return null;

  const id = user._id || user.id || user.user_id;
  const roleObject = getRoleObject(user);
  const roleId = roleObject?._id || user.role_id || null;
  const roleName = getRoleNameFromUser(user) || "UNKNOWN_ROLE";

  const normalizedSession = sessionInfo || {
    is_online: false,
    session_status: "OFFLINE",
    last_activity: null,
    active_sessions: 0,
  };

  return {
    id,
    _id: id,
    user_id: id,

    email: user.email,
    full_name: user.full_name || user.fullName || user.name || "Người dùng",
    fullName: user.fullName || user.full_name || user.name || "Người dùng",

    avatar_url: user.avatar_url || user.avatarUrl || null,
    avatarUrl: user.avatarUrl || user.avatar_url || null,

    department_id: user.department_id || null,
    department:
      user.department_id && typeof user.department_id === "object"
        ? user.department_id
        : undefined,

    team_id: user.team_id || null,
    team:
      user.team_id && typeof user.team_id === "object"
        ? user.team_id
        : undefined,

    role_id: roleObject
      ? {
          _id: roleObject._id,
          id: roleObject._id,
          name: roleObject.name,
          scope: roleObject.scope,
        }
      : roleId,

    role_name: roleName,
    roleName: roleName,
    role_code: roleName,
    roleCode: roleName,
    system_role: roleName,
    systemRole: roleName,
    system_role_ids: roleName !== "UNKNOWN_ROLE" ? [roleName] : [],

    status: user.status,

    is_online: normalizedSession.is_online,
    isOnline: normalizedSession.is_online,
    online: normalizedSession.is_online,
    session_status: normalizedSession.session_status,
    last_activity: normalizedSession.last_activity,
    lastActivity: normalizedSession.last_activity,
    active_sessions: normalizedSession.active_sessions,

    created_at: user.created_at,
    updated_at: user.updated_at,
  };
};

const assertTargetSystemAdminVisible = async (targetUserId, actorId) => {
  const [target, actor] = await Promise.all([
    User.findById(targetUserId).populate("role_id", "name scope").lean(),
    getActor(actorId),
  ]);

  if (!target) {
    throw new AppError("User not found", 404, "USER_NOT_FOUND");
  }

  const targetIsSystemAdmin = isSystemAdminUser(target);
  const actorIsSystemAdmin = isSystemAdminUser(actor);

  if (targetIsSystemAdmin) {
    const targetId = getUserId(target);
    const actorIdString = getUserId(actor);

    if (!actorIsSystemAdmin || targetId !== actorIdString) {
      throw new AppError(
        "SYSTEM_ADMIN account is protected and cannot be selected or modified by this user",
        403,
        "SYSTEM_ADMIN_PROTECTED",
      );
    }
  }

  return target;
};

const logSafeActivity = async (payload) => {
  try {
    if (activityService && typeof activityService.logActivity === "function") {
      await activityService.logActivity(payload);
    }
  } catch (error) {
    console.warn("[user.service] Failed to write activity log:", error.message);
  }
};

exports.getUserById = async (userId, actorId) => {
  const target = await assertTargetSystemAdminVisible(userId, actorId);

  const sessionMap = await getSessionMap([target]);

  return normalizeUserForResponse(target, sessionMap.get(String(target._id)));
};

exports.getAllUsers = async ({
  page = 0,
  size = 100,
  search = "",
  actorId,
  excludeSystemAdmin = false,
  includeCurrentSystemAdmin = false,
}) => {
  const safePage = Math.max(Number(page) || 0, 0);
  const safeSize = Math.min(Math.max(Number(size) || 100, 1), 500);
  const skip = safePage * safeSize;

  const visibilityContext = await getActorVisibilityContext({
    actorId,
    excludeSystemAdmin,
    includeCurrentSystemAdmin,
  });

  const searchFilter = buildSearchFilter(search);
  const finalFilter = await applySystemAdminVisibilityFilter(
    searchFilter,
    visibilityContext,
  );

  const [totalElements, users] = await Promise.all([
    User.countDocuments(finalFilter),
    User.find(finalFilter)
      .select(
        "-password -password_hash -reset_password_token -reset_password_expires",
      )
      .populate("role_id", "name scope")
      .populate("team_id", "name")
      .populate("department_id", "name")
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(safeSize)
      .lean(),
  ]);

  const sessionMap = await getSessionMap(users);

  const normalizedUsers = users.map((user) => {
    return normalizeUserForResponse(user, sessionMap.get(String(user._id)));
  });

  return {
    users: normalizedUsers,
    page: safePage,
    size: safeSize,
    totalElements,
    totalPages: Math.ceil(totalElements / safeSize),
    hasNext: (safePage + 1) * safeSize < totalElements,
  };
};

exports.createUser = async (
  { full_name, fullName, email, password, role_id, roleId },
  actorId,
) => {
  const finalFullName = full_name || fullName;
  const finalRoleId = role_id || roleId;

  if (!finalFullName || !email || !password || !finalRoleId) {
    throw new AppError(
      "Please provide full_name, email, password and role_id",
      400,
      "BAD_REQUEST",
    );
  }

  const role = await Role.findById(finalRoleId).lean();

  if (!role) {
    throw new AppError("Role not found", 404, "ROLE_NOT_FOUND");
  }

  if (normalizeRoleName(role.name) === "SYSTEM_ADMIN") {
    throw new AppError(
      "SYSTEM_ADMIN role cannot be assigned from user management screen",
      403,
      "SYSTEM_ADMIN_ROLE_PROTECTED",
    );
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  const existingUser = await User.findOne({
    email: normalizedEmail,
  });

  if (existingUser) {
    throw new AppError(
      "Email is already in use within the system",
      409,
      "CONFLICT",
    );
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const createdUser = await User.create({
    full_name: String(finalFullName).trim(),
    email: normalizedEmail,
    password_hash: hashedPassword,
    role_id: finalRoleId,
    status: "ACTIVE",
  });

  const populatedUser = await User.findById(createdUser._id)
    .select(
      "-password -password_hash -reset_password_token -reset_password_expires",
    )
    .populate("role_id", "name scope")
    .populate("team_id", "name")
    .populate("department_id", "name")
    .lean();

  const normalizedUser = normalizeUserForResponse(populatedUser);

  await logSafeActivity({
    action: "CREATE_USER",
    source: "SECURITY",
    actor_id: actorId,
    target_id: createdUser._id,
    target_type: "User",
    details: {
      message: `Người dùng ${normalizedUser.full_name} đã được tạo`,
      created_user_id: String(createdUser._id),
      created_user_email: normalizedUser.email,
      created_user_role: normalizedUser.role_name,
    },
  });

  eventBus.emit("USER_CREATED", {
    userId: createdUser._id,
    role: normalizedUser.role_name,
  });

  return normalizedUser;
};

// ==========================================
// 2. NGHIỆP VỤ TỔ CHỨC & PHÒNG BAN
// ==========================================

exports.getUnassignedUsers = async ({
  actorId,
  excludeSystemAdmin = true,
  includeCurrentSystemAdmin = false,
} = {}) => {
  const visibilityContext = await getActorVisibilityContext({
    actorId,
    excludeSystemAdmin,
    includeCurrentSystemAdmin,
  });

  const baseFilter = {
    status: "ACTIVE",
    team_id: null,
  };

  const finalFilter = await applySystemAdminVisibilityFilter(
    baseFilter,
    visibilityContext,
  );

  const users = await User.find(finalFilter)
    .select("_id full_name email role_id avatar_url status")
    .populate("role_id", "name scope")
    .sort({ full_name: 1 })
    .lean();

  const sessionMap = await getSessionMap(users);

  return users.map((user) => {
    return normalizeUserForResponse(user, sessionMap.get(String(user._id)));
  });
};

exports.assignTeam = async (userId, teamId, actorId) => {
  await assertTargetSystemAdminVisible(userId, actorId);

  const team = await Team.findById(teamId).lean();

  if (!team) {
    throw new AppError("Team not found", 404, "TEAM_NOT_FOUND");
  }

  const user = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        team_id: team._id,
        department_id: team.department_id,
      },
    },
    {
      new: true,
      runValidators: true,
    },
  )
    .select(
      "-password -password_hash -reset_password_token -reset_password_expires",
    )
    .populate("role_id", "name scope")
    .populate("team_id", "name")
    .populate("department_id", "name");

  if (!user) {
    throw new AppError("User not found", 404, "USER_NOT_FOUND");
  }

  await logSafeActivity({
    action: "UPDATE",
    source: "USER",
    actor_id: actorId,
    target_id: user._id,
    target_type: "User",
    details: {
      message: `Assigned user to team: ${team.name}`,
      team_id: String(team._id),
      team_name: team.name,
    },
  });

  eventBus.emit("ORGANIZATION_UPDATED", {
    type: "MEMBER_ASSIGNED",
    userId: user._id,
    teamId: team._id,
  });

  return normalizeUserForResponse(user.toObject());
};

// ==========================================
// 3. THU HỒI TRUY CẬP VÀ ĐÌNH CHỈ QUYỀN HẠN
// ==========================================

exports.revokeAccess = async (userId, actorId) => {
  await assertTargetSystemAdminVisible(userId, actorId);

  const user = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        status: "INACTIVE",
      },
    },
    {
      new: true,
    },
  )
    .select(
      "-password -password_hash -reset_password_token -reset_password_expires",
    )
    .populate("role_id", "name scope")
    .lean();

  if (!user) {
    throw new AppError("User not found", 404, "USER_NOT_FOUND");
  }

  await UserSession.updateMany(
    {
      user_id: user._id,
    },
    {
      $set: {
        is_active: false,
      },
    },
  );

  eventBus.emit("USER_REVOKED", {
    userId,
    reason: "Your access has been revoked by an administrator.",
  });

  await logSafeActivity({
    action: "UPDATE",
    source: "SECURITY",
    actor_id: actorId,
    target_id: user._id,
    target_type: "User",
    details: {
      message: `Tài khoản ${user.full_name} đã bị thu hồi quyền truy cập`,
      revoked_user_role: getRoleNameFromUser(user),
    },
  });

  return normalizeUserForResponse(user);
};
