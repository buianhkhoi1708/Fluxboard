const Board = require("../models/board.model");
const Column = require("../../column/models/column.model");
const Task = require("../../task/models/task.model");
const Role = require("../../rbac/models/role.model");
const User = require("../../user/models/user.model");
const AppError = require("../../../common/exceptions/AppError");
const taskCoreService = require("../../task/services/taskCore.service");

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

const sanitizeTaskAssignees = (task, context) => {
  if (!task || typeof task !== "object") {
    return task;
  }

  return {
    ...task,
    assignees_user_id: Array.isArray(task.assignees_user_id)
      ? task.assignees_user_id.filter((user) => shouldExposeUser(user, context))
      : [],
    assignee_id:
      task.assignee_id && typeof task.assignee_id === "object"
        ? shouldExposeUser(task.assignee_id, context)
          ? task.assignee_id
          : null
        : task.assignee_id,
  };
};

exports.createBoard = async (
  project_id,
  name,
  description,
  createDefaultCols = true,
) => {
  if (!project_id) {
    throw new AppError("Missing project_id", 400, "VALIDATION_FAILED");
  }

  if (!name || !String(name).trim()) {
    throw new AppError("Missing board name", 400, "VALIDATION_FAILED");
  }

  const board = await Board.create({
    project_id,
    name: String(name).trim(),
    description,
    column_order_ids: [],
  });

  if (createDefaultCols !== false) {
    const defaultColumns = [
      {
        name: "To Do",
        board_id: board._id,
        task_order_ids: [],
      },
      {
        name: "Doing",
        board_id: board._id,
        task_order_ids: [],
      },
      {
        name: "Done",
        board_id: board._id,
        task_order_ids: [],
      },
    ];

    const createdColumns = await Column.insertMany(defaultColumns);

    board.column_order_ids = createdColumns.map((column) => column._id);

    await board.save();
  }

  return board;
};

exports.getBoardDetail = async (boardId, actorUser = null) => {
  const context = await buildVisibilityContext(actorUser);

  const board = await Board.findById(boardId)
    .populate({
      path: "column_order_ids",
      match: {
        is_deleted: {
          $ne: true,
        },
      },
      populate: {
        path: "task_order_ids",
        model: "Task",
        match: {
          is_deleted: {
            $ne: true,
          },
        },
        populate: [
          {
            path: "deadline_info",
            model: "TaskDeadline",
          },
          {
            path: "assignees_user_id",
            model: "User",
            select: "full_name email avatar_url role_id",
            populate: {
              path: "role_id",
              select: "name scope",
            },
          },
          {
            path: "assignee_id",
            model: "User",
            select: "full_name email avatar_url role_id",
            populate: {
              path: "role_id",
              select: "name scope",
            },
          },
        ],
      },
    })
    .lean({
      virtuals: true,
    });

  if (!board) {
    throw new AppError("Board not found", 404, "NOT_FOUND");
  }

  if (Array.isArray(board.column_order_ids)) {
    board.column_order_ids = board.column_order_ids.filter(Boolean);

    board.column_order_ids.forEach((column) => {
      if (!Array.isArray(column.task_order_ids)) {
        column.task_order_ids = [];
        return;
      }

      column.task_order_ids = column.task_order_ids
        .filter(Boolean)
        .map((task) => {
          const sanitizedTask = sanitizeTaskAssignees(task, context);

          return {
            ...sanitizedTask,
            start_date:
              sanitizedTask.deadline_info?.start_date ||
              sanitizedTask.start_date ||
              null,
            due_date:
              sanitizedTask.deadline_info?.due_date ||
              sanitizedTask.due_date ||
              null,
            assignees_user_id: sanitizedTask.assignees_user_id || [],
            story_point: sanitizedTask.story_point || 0,
          };
        });
    });
  }

  return board;
};

exports.updateBoard = async (boardId, updateData) => {
  const board = await Board.findByIdAndUpdate(boardId, updateData, {
    new: true,
  });

  if (!board) {
    throw new AppError("Board not found", 404, "NOT_FOUND");
  }

  return board;
};

exports.deleteBoard = async (boardId) => {
  const board = await Board.findByIdAndUpdate(
    boardId,
    {
      is_deleted: true,
    },
    {
      new: true,
    },
  );

  if (!board) {
    throw new AppError("Board not found", 404, "NOT_FOUND");
  }

  await Column.updateMany(
    {
      board_id: boardId,
    },
    {
      $set: {
        is_deleted: true,
      },
    },
  );

  const tasks = await Task.find({
    board_id: boardId,
  })
    .select("_id")
    .lean();

  for (const task of tasks) {
    await taskCoreService.deleteTask(task._id);
  }

  return true;
};
