const mongoose = require("mongoose");

const Activity = require("../models/activity.model");
const User = require("../../user/models/user.model");
const Role = require("../../rbac/models/role.model");
const { paginate } = require("../../../common/utils/pagination.util");
const eventBus = require("../../../common/utils/eventBus");

const safePopulate = {
  path: "actor_id",
  select: "full_name email avatar_url role_id",
  populate: {
    path: "role_id",
    select: "name scope",
  },
};

const normalizeRoleName = (value) => {
  if (!value) return "";

  return String(value)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
};

const toObjectIdOrNull = (value) => {
  if (!value) return null;

  const raw =
    typeof value === "object" ? value._id || value.id || value.user_id : value;

  if (!mongoose.Types.ObjectId.isValid(String(raw))) {
    return null;
  }

  return new mongoose.Types.ObjectId(String(raw));
};

const getActorRoleName = (actor) => {
  if (!actor) return "SYSTEM";

  const directRole =
    actor.role_name ||
    actor.roleName ||
    actor.system_role ||
    actor.systemRole ||
    actor.role ||
    actor.role_code ||
    actor.roleCode;

  if (directRole) {
    return normalizeRoleName(directRole);
  }

  if (actor.role_id && typeof actor.role_id === "object") {
    return normalizeRoleName(actor.role_id.name || actor.role_id.code);
  }

  return "UNKNOWN_ROLE";
};

const buildDateFilter = ({ from, to }) => {
  if (!from && !to) return undefined;

  const createdAt = {};

  if (from) {
    const fromDate = new Date(from);

    if (!Number.isNaN(fromDate.getTime())) {
      createdAt.$gte = fromDate;
    }
  }

  if (to) {
    const toDate = new Date(to);

    if (!Number.isNaN(toDate.getTime())) {
      createdAt.$lte = toDate;
    }
  }

  return Object.keys(createdAt).length > 0 ? createdAt : undefined;
};

const normalizePage = (page) => {
  const parsed = Number.parseInt(page, 10);

  if (Number.isNaN(parsed) || parsed < 0) {
    return 0;
  }

  return parsed;
};

const normalizeSize = (size) => {
  const parsed = Number.parseInt(size, 10);

  if (Number.isNaN(parsed) || parsed <= 0) {
    return 20;
  }

  return Math.min(parsed, 200);
};

const getMessage = (activity) => {
  return (
    activity.details?.message || activity.message || "Có một hành động mới"
  );
};

const formatActivity = (activity) => {
  const actor = activity.actor_id;

  const actorId = actor?._id || actor?.id || activity.actor_id || null;

  const actorRoleName = getActorRoleName(actor);

  return {
    id: activity._id,
    _id: activity._id,

    message: getMessage(activity),

    actor: actor
      ? {
          user_id: actorId,
          id: actorId,
          _id: actorId,
          full_name: actor.full_name || "Người dùng",
          fullName: actor.full_name || "Người dùng",
          email: actor.email || null,
          avatar_url: actor.avatar_url || null,
          avatarUrl: actor.avatar_url || null,

          role_id: actor.role_id || null,
          role_name: actorRoleName,
          roleName: actorRoleName,
          role_code: actorRoleName,
          roleCode: actorRoleName,
          system_role: actorRoleName,
          systemRole: actorRoleName,
        }
      : {
          user_id: null,
          id: null,
          _id: null,
          full_name: "Hệ thống",
          fullName: "Hệ thống",
          email: null,
          avatar_url: null,
          avatarUrl: null,

          role_id: null,
          role_name: "SYSTEM",
          roleName: "SYSTEM",
          role_code: "SYSTEM",
          roleCode: "SYSTEM",
          system_role: "SYSTEM",
          systemRole: "SYSTEM",
        },

    role_name: actorRoleName,
    role_code: actorRoleName,
    system_role: actorRoleName,

    created_at: activity.created_at,
    action: activity.action,
    source_type: activity.source,
    source: activity.source,

    target_id: activity.target_id || null,
    target_type: activity.target_type || null,
    project_id: activity.project_id || null,

    details: activity.details || {},
    ip_address: activity.ip_address || null,
  };
};

const normalizeLogPayload = (data = {}) => {
  const actorId = data.actor_id || data.actor_user_id || data.user_id || null;

  const targetId = data.target_id || data.source_id || null;

  const projectId = data.project_id || data.projectId || null;

  const message = data.message || data.details?.message || null;

  return {
    action: data.action || "UPDATE",
    source: data.source || data.source_type || "SYSTEM",

    actor_id: toObjectIdOrNull(actorId),
    target_id: toObjectIdOrNull(targetId),
    target_type: data.target_type || data.source_type || null,
    project_id: toObjectIdOrNull(projectId),

    details: {
      ...(data.details || {}),
      ...(message ? { message } : {}),
    },

    ip_address: data.ip_address || null,
  };
};

exports.logActivity = async (data) => {
  try {
    const payload = normalizeLogPayload(data);

    return await Activity.create(payload);
  } catch (error) {
    console.error("Failed to log activity:", error);
    return null;
  }
};

exports.getProjectActivities = async (projectId, page = 1, limit = 20) => {
  return await paginate(
    Activity,
    { project_id: projectId },
    page,
    limit,
    safePopulate,
  );
};

exports.getTaskActivities = async (taskId, page = 1, limit = 20) => {
  return await paginate(
    Activity,
    {
      target_id: taskId,
      target_type: "Task",
    },
    page,
    limit,
    safePopulate,
  );
};

exports.getActivities = async ({
  projectId,
  page = 0,
  size = 20,
  sourceType,
  action,
  from,
  to,
} = {}) => {
  const safePage = normalizePage(page);
  const safeSize = normalizeSize(size);

  const query = {};

  if (projectId) {
    query.project_id = projectId;
  }

  if (sourceType) {
    query.source = String(sourceType).toUpperCase();
  }

  if (action) {
    query.action = String(action).toUpperCase();
  }

  const dateFilter = buildDateFilter({ from, to });

  if (dateFilter) {
    query.created_at = dateFilter;
  }

  const [totalElements, activities] = await Promise.all([
    Activity.countDocuments(query),

    Activity.find(query)
      .populate(safePopulate)
      .sort({ created_at: -1 })
      .skip(safePage * safeSize)
      .limit(safeSize)
      .lean(),
  ]);

  return {
    activities: activities.map(formatActivity),
    page: safePage,
    size: safeSize,
    totalElements,
    totalPages: Math.ceil(totalElements / safeSize),
    hasNext: (safePage + 1) * safeSize < totalElements,
    hasPrevious: safePage > 0,
  };
};

exports.getSecurityActivities = async ({
  page = 0,
  size = 100,
  from,
  to,
} = {}) => {
  const safePage = normalizePage(page);
  const safeSize = normalizeSize(size);

  const query = {
    $or: [
      { source: "SECURITY" },
      {
        action: {
          $in: [
            "CREATE_USER",
            "CHANGE_PASSWORD",
            "REVOKE_ACCESS",
            "LOGIN",
            "LOGOUT",
          ],
        },
      },
    ],
  };

  const dateFilter = buildDateFilter({ from, to });

  if (dateFilter) {
    query.created_at = dateFilter;
  }

  const [totalElements, activities] = await Promise.all([
    Activity.countDocuments(query),

    Activity.find(query)
      .populate(safePopulate)
      .sort({ created_at: -1 })
      .skip(safePage * safeSize)
      .limit(safeSize)
      .lean(),
  ]);

  return {
    activities: activities.map(formatActivity),
    page: safePage,
    size: safeSize,
    totalElements,
    totalPages: Math.ceil(totalElements / safeSize),
    hasNext: (safePage + 1) * safeSize < totalElements,
    hasPrevious: safePage > 0,
  };
};

eventBus.on("activity_log", async (payload = {}) => {
  await exports.logActivity(payload);
});
