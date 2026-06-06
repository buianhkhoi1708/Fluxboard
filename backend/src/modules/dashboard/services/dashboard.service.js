const Task = require("../../task/models/task.model");
const TaskDeadline = require("../../deadline/models/taskDeadline.model");
const User = require("../../user/models/user.model");
const Department = require("../../department/models/department.model");
const Team = require("../../team/models/team.model");
const Role = require("../../rbac/models/role.model");
const Project = require("../../project/models/project.model");
const ProjectMember = require("../../projectMember/models/projectMember.model");
const Board = require("../../board/models/board.model");
const mongoose = require("mongoose");

const kpiCache = new Map();
const CACHE_TTL = 15 * 60 * 1000;

const toObjectId = (value) => {
  if (!value) return null;
  const str = String(value);
  return mongoose.Types.ObjectId.isValid(str)
    ? new mongoose.Types.ObjectId(str)
    : null;
};

const uniqueObjectIds = (values = []) => {
  const seen = new Set();
  return values
    .map(toObjectId)
    .filter(Boolean)
    .filter((id) => {
      const key = String(id);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const normalizeRoleName = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");

const emptyManagerPayload = (teams = []) => ({
  team_workload_capacity: teams.map((team) => ({
    team_id: String(team._id),
    team_name: team.name || team.code || "Chưa đặt tên team",
    team_code: team.code || "",
    completed_points: 0,
    total_points: 0,
    completion_rate: 0,
    member_count: 0,
    status: "NO_DATA",
  })),
  team_deadline_status: { on_track: 0, at_risk: 0, overdue: 0 },
  at_risk_tasks: [],
  ai_efficiency: [],
});

exports.getMetricsByRole = async (jwtUser, queryParams) => {
  const userId = jwtUser._id || jwtUser.id || jwtUser.user_id;
  const fullUser = await User.findById(userId).lean();
  if (!fullUser) return getMemberMetrics(userId, queryParams);

  const userRoleIds = fullUser.role_id ? [fullUser.role_id] : [];
  const roles = await Role.find({ _id: { $in: userRoleIds } })
    .select("name")
    .lean();
  const roleNames = roles.map((r) => normalizeRoleName(r.name));
  const fallbackRole = normalizeRoleName(
    jwtUser.system_role ||
      jwtUser.role_name ||
      jwtUser.role ||
      fullUser.system_role ||
      fullUser.role_name ||
      fullUser.role,
  );
  if (fallbackRole && !roleNames.includes(fallbackRole))
    roleNames.push(fallbackRole);

  const systemRoles = ["SYSTEM_ADMIN", "ADMIN"];
  const managerRoles = ["PROJECT_ADMIN", "PM", "LEAD", "MANAGER"];
  const hasSystemRole = roleNames.some((r) => systemRoles.includes(r));
  const hasManagerRole = roleNames.some((r) => managerRoles.includes(r));

  if (hasSystemRole) return getSystemAdminMetrics(queryParams);
  if (hasManagerRole) return getManagerMetrics(userId, queryParams);
  return getMemberMetrics(userId, queryParams);
};

const getSystemAdminMetrics = async (queryParams) => {
  const now = new Date();
  const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  let orgKpi;

  if (
    kpiCache.has("orgKpi") &&
    kpiCache.get("orgKpi").expires > now.getTime()
  ) {
    orgKpi = kpiCache.get("orgKpi").data;
  } else {
    const [totalUsers, totalDepartments, totalTeams] = await Promise.all([
      User.countDocuments({ status: "ACTIVE" }),
      Department.countDocuments({ is_deleted: false }),
      Team.countDocuments({ is_deleted: false }),
    ]);
    orgKpi = {
      total_active_members: totalUsers,
      total_departments: totalDepartments,
      total_teams: totalTeams,
    };
    kpiCache.set("orgKpi", {
      data: orgKpi,
      expires: now.getTime() + CACHE_TTL,
    });
  }

  const taskStatusPipeline = [
    { $match: { is_deleted: false } },
    {
      $lookup: {
        from: "taskdeadlines",
        localField: "_id",
        foreignField: "task_id",
        as: "deadline",
      },
    },
    {
      $unwind: {
        path: "$deadline",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        is_completed_task: {
          $or: [{ $eq: ["$is_done", true] }, { $eq: ["$status", "DONE"] }],
        },
        is_overdue_task: {
          $and: [
            { $ne: ["$is_done", true] },
            { $ne: ["$status", "DONE"] },
            {
              $or: [
                { $eq: ["$deadline.is_overdue", true] },
                {
                  $and: [
                    { $ne: ["$deadline.due_date", null] },
                    { $lt: ["$deadline.due_date", now] },
                  ],
                },
              ],
            },
          ],
        },
        is_at_risk_task: {
          $and: [
            { $ne: ["$is_done", true] },
            { $ne: ["$status", "DONE"] },
            { $ne: ["$deadline.due_date", null] },
            { $gte: ["$deadline.due_date", now] },
            { $lte: ["$deadline.due_date", next24h] },
            { $ne: ["$deadline.is_overdue", true] },
          ],
        },
        extension_count_safe: {
          $ifNull: ["$deadline.extension_count", 0],
        },
      },
    },
    {
      $addFields: {
        task_status_bucket: {
          $switch: {
            branches: [
              {
                case: "$is_completed_task",
                then: "COMPLETED",
              },
              {
                case: "$is_overdue_task",
                then: "OVERDUE",
              },
              {
                case: "$is_at_risk_task",
                then: "AT_RISK",
              },
            ],
            default: "IN_PROGRESS",
          },
        },
      },
    },
  ];

  const companyStatsRaw = await Task.aggregate([
    ...taskStatusPipeline,
    {
      $group: {
        _id: null,
        total_tasks: { $sum: 1 },
        in_progress: {
          $sum: {
            $cond: [{ $eq: ["$task_status_bucket", "IN_PROGRESS"] }, 1, 0],
          },
        },
        completed: {
          $sum: {
            $cond: [{ $eq: ["$task_status_bucket", "COMPLETED"] }, 1, 0],
          },
        },
        at_risk: {
          $sum: {
            $cond: [{ $eq: ["$task_status_bucket", "AT_RISK"] }, 1, 0],
          },
        },
        overdue: {
          $sum: {
            $cond: [{ $eq: ["$task_status_bucket", "OVERDUE"] }, 1, 0],
          },
        },
        total_extensions_this_week: {
          $sum: "$extension_count_safe",
        },
      },
    },
  ]);

  const companyStats = companyStatsRaw[0] || {
    total_tasks: 0,
    in_progress: 0,
    completed: 0,
    at_risk: 0,
    overdue: 0,
    total_extensions_this_week: 0,
  };

  const deptPerformance = await Task.aggregate([
    ...taskStatusPipeline,
    {
      $addFields: {
        assignment_user_ids: {
          $setUnion: [
            {
              $cond: [{ $ne: ["$assignee_id", null] }, ["$assignee_id"], []],
            },
            {
              $ifNull: ["$assignees_user_id", []],
            },
          ],
        },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "assignment_user_ids",
        foreignField: "_id",
        as: "assignees",
      },
    },
    {
      $unwind: {
        path: "$assignees",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "departments",
        localField: "assignees.department_id",
        foreignField: "_id",
        as: "dept",
      },
    },
    {
      $unwind: {
        path: "$dept",
        preserveNullAndEmptyArrays: false,
      },
    },
    {
      $match: {
        "dept._id": { $ne: null },
        "dept.is_deleted": { $ne: true },
      },
    },
    {
      $group: {
        _id: {
          task_id: "$_id",
          department_id: "$dept._id",
        },
        department_name: {
          $first: "$dept.name",
        },
        task_status_bucket: {
          $first: "$task_status_bucket",
        },
      },
    },
    {
      $group: {
        _id: "$_id.department_id",
        department_name: {
          $first: "$department_name",
        },
        total_tasks: {
          $sum: 1,
        },
        in_progress_tasks: {
          $sum: {
            $cond: [{ $eq: ["$task_status_bucket", "IN_PROGRESS"] }, 1, 0],
          },
        },
        completed_tasks: {
          $sum: {
            $cond: [{ $eq: ["$task_status_bucket", "COMPLETED"] }, 1, 0],
          },
        },
        at_risk_tasks: {
          $sum: {
            $cond: [{ $eq: ["$task_status_bucket", "AT_RISK"] }, 1, 0],
          },
        },
        overdue_tasks: {
          $sum: {
            $cond: [{ $eq: ["$task_status_bucket", "OVERDUE"] }, 1, 0],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        department_id: "$_id",
        department_name: 1,
        total_tasks: 1,
        in_progress_tasks: 1,
        completed_tasks: 1,
        on_track_tasks: "$completed_tasks",
        at_risk_tasks: 1,
        overdue_tasks: 1,
      },
    },
    {
      $sort: {
        department_name: 1,
      },
    },
  ]);

  return {
    organization_kpi: orgKpi,
    company_deadline_health: {
      in_progress: companyStats.in_progress,
      completed: companyStats.completed,
      on_track: companyStats.completed,
      at_risk: companyStats.at_risk,
      overdue: companyStats.overdue,
      total_tasks: companyStats.total_tasks,
      total_extensions_this_week: companyStats.total_extensions_this_week,
    },
    department_performance: deptPerformance,
    critical_audit_logs: [
      {
        id: "act-001",
        actor: "System",
        message: "System is operating normally",
        created_at: now.toISOString(),
      },
    ],
  };
};

const getManagerProjectIds = async (managerId, departmentId) => {
  const managerObjectId = toObjectId(managerId);
  const departmentObjectId = toObjectId(departmentId);

  const [memberships, ownedProjects, departmentProjects] = await Promise.all([
    ProjectMember.find({
      user_id: managerObjectId,
      is_active: true,
      is_deleted: false,
    })
      .select("project_id")
      .lean(),
    Project.find({ owner_id: managerObjectId, is_deleted: false })
      .select("_id")
      .lean(),
    departmentObjectId
      ? Project.find({ department_id: departmentObjectId, is_deleted: false })
          .select("_id")
          .lean()
      : Promise.resolve([]),
  ]);

  return uniqueObjectIds([
    ...memberships.map((item) => item.project_id),
    ...ownedProjects.map((item) => item._id),
    ...departmentProjects.map((item) => item._id),
  ]);
};

const buildTeamWorkload = async (departmentId, projectIds) => {
  const departmentObjectId = toObjectId(departmentId);
  const teams = departmentObjectId
    ? await Team.find({ department_id: departmentObjectId, is_deleted: false })
        .select("_id name code")
        .sort({ name: 1 })
        .lean()
    : [];

  if (!departmentObjectId || projectIds.length === 0)
    return emptyManagerPayload(teams).team_workload_capacity;

  const memberCounts = await User.aggregate([
    {
      $match: {
        department_id: departmentObjectId,
        status: "ACTIVE",
        team_id: { $ne: null },
      },
    },
    { $group: { _id: "$team_id", member_count: { $sum: 1 } } },
  ]);

  const memberCountMap = new Map(
    memberCounts.map((item) => [String(item._id), item.member_count]),
  );

  const workloadRaw = await Task.aggregate([
    {
      $match: {
        is_deleted: false,
        project_id: { $in: projectIds },
        story_point: { $gt: 0 },
      },
    },
    {
      $project: {
        story_point: { $ifNull: ["$story_point", 0] },
        is_done: 1,
        status: 1,
        assignment_user_ids: {
          $setUnion: [
            { $cond: [{ $ne: ["$assignee_id", null] }, ["$assignee_id"], []] },
            { $ifNull: ["$assignees_user_id", []] },
          ],
        },
      },
    },
    { $unwind: "$assignment_user_ids" },
    {
      $lookup: {
        from: "users",
        localField: "assignment_user_ids",
        foreignField: "_id",
        as: "assignee",
      },
    },
    { $unwind: "$assignee" },
    {
      $match: {
        "assignee.department_id": departmentObjectId,
        "assignee.team_id": { $ne: null },
        "assignee.status": "ACTIVE",
      },
    },
    {
      $group: {
        _id: { team_id: "$assignee.team_id", task_id: "$_id" },
        story_point: { $first: "$story_point" },
        completed_point: {
          $first: {
            $cond: [
              {
                $or: [
                  { $eq: ["$is_done", true] },
                  { $eq: ["$status", "DONE"] },
                ],
              },
              "$story_point",
              0,
            ],
          },
        },
      },
    },
    {
      $group: {
        _id: "$_id.team_id",
        total_points: { $sum: "$story_point" },
        completed_points: { $sum: "$completed_point" },
        task_count: { $sum: 1 },
      },
    },
  ]);

  const workloadMap = new Map(
    workloadRaw.map((item) => [String(item._id), item]),
  );
  return teams.map((team) => {
    const key = String(team._id);
    const info = workloadMap.get(key) || {};
    const totalPoints = Number(info.total_points || 0);
    const completedPoints = Number(info.completed_points || 0);
    const completionRate =
      totalPoints > 0
        ? Math.round((completedPoints / totalPoints) * 1000) / 10
        : 0;

    return {
      team_id: key,
      team_name: team.name || team.code || "Chưa đặt tên team",
      team_code: team.code || "",
      completed_points: completedPoints,
      total_points: totalPoints,
      completion_rate: completionRate,
      member_count: memberCountMap.get(key) || 0,
      status:
        totalPoints === 0
          ? "NO_DATA"
          : completionRate >= 100
            ? "DONE"
            : "IN_PROGRESS",
    };
  });
};

const buildDeadlineStatus = async (projectIds) => {
  const now = new Date();
  const warningDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const result = await TaskDeadline.aggregate([
    { $match: { is_deleted: false } },
    {
      $lookup: {
        from: "tasks",
        localField: "task_id",
        foreignField: "_id",
        as: "task",
      },
    },
    { $unwind: "$task" },
    {
      $match: {
        "task.is_deleted": false,
        "task.project_id": { $in: projectIds },
        "task.is_done": { $ne: true },
        "task.status": { $ne: "DONE" },
      },
    },
    {
      $group: {
        _id: null,
        overdue: {
          $sum: {
            $cond: [
              {
                $or: [
                  { $eq: ["$is_overdue", true] },
                  { $lt: ["$due_date", now] },
                ],
              },
              1,
              0,
            ],
          },
        },
        at_risk: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$is_overdue", false] },
                  { $gte: ["$due_date", now] },
                  { $lte: ["$due_date", warningDate] },
                ],
              },
              1,
              0,
            ],
          },
        },
        on_track: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$is_overdue", false] },
                  { $gt: ["$due_date", warningDate] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  return result[0] || { on_track: 0, at_risk: 0, overdue: 0 };
};

const buildAtRiskTasks = async (projectIds) => {
  const now = new Date();
  const raw = await TaskDeadline.aggregate([
    { $match: { is_deleted: false, due_date: { $ne: null } } },
    {
      $lookup: {
        from: "tasks",
        localField: "task_id",
        foreignField: "_id",
        as: "task",
      },
    },
    { $unwind: "$task" },
    {
      $match: {
        "task.is_deleted": false,
        "task.project_id": { $in: projectIds },
        "task.is_done": { $ne: true },
        "task.status": { $ne: "DONE" },
      },
    },
    {
      $addFields: {
        assignment_user_ids: {
          $setUnion: [
            {
              $cond: [
                { $ne: ["$task.assignee_id", null] },
                ["$task.assignee_id"],
                [],
              ],
            },
            { $ifNull: ["$task.assignees_user_id", []] },
          ],
        },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "assignment_user_ids",
        foreignField: "_id",
        as: "assignees",
      },
    },
    {
      $lookup: {
        from: "projects",
        localField: "task.project_id",
        foreignField: "_id",
        as: "project",
      },
    },
    { $unwind: { path: "$project", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "boards",
        localField: "task.board_id",
        foreignField: "_id",
        as: "board",
      },
    },
    { $unwind: { path: "$board", preserveNullAndEmptyArrays: true } },
    { $sort: { due_date: 1 } },
    { $limit: 10 },
    {
      $project: {
        _id: 0,
        task_id: "$task._id",
        title: "$task.title",
        priority: "$task.priority",
        story_point: "$task.story_point",
        due_date: 1,
        extension_count: { $ifNull: ["$extension_count", 0] },
        project_id: "$task.project_id",
        project_name: "$project.name",
        board_id: "$task.board_id",
        board_name: "$board.name",
        is_overdue: 1,
        assignees: {
          $map: {
            input: "$assignees",
            as: "user",
            in: {
              user_id: "$$user._id",
              full_name: "$$user.full_name",
              avatar_url: "$$user.avatar_url",
              email: "$$user.email",
            },
          },
        },
      },
    },
  ]);

  return raw.map((item) => {
    const dueDate = item.due_date ? new Date(item.due_date) : null;
    const isOverdue = item.is_overdue || (dueDate && dueDate < now);
    const hoursLeft = dueDate
      ? Math.max(
          0,
          Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60)),
        )
      : null;

    return {
      task_id: item.task_id,
      title: item.title,
      priority: item.priority || "MEDIUM",
      story_point: item.story_point || 0,
      due_date: item.due_date,
      deadline_status: isOverdue ? "OVERDUE" : "AT_RISK",
      extension_count: item.extension_count || 0,
      project_id: item.project_id,
      project_name: item.project_name || "Chưa rõ project",
      board_id: item.board_id,
      board_name: item.board_name || "Chưa rõ board",
      assignees: item.assignees || [],
      hours_left: hoursLeft,
    };
  });
};

const buildAiEfficiency = async (projectIds) => {
  if (!projectIds.length) return [];

  const [projects, boardCounts, taskStats] = await Promise.all([
    Project.find({ _id: { $in: projectIds }, is_deleted: false })
      .select("_id name")
      .lean(),
    Board.aggregate([
      { $match: { project_id: { $in: projectIds }, is_deleted: false } },
      { $group: { _id: "$project_id", boards_count: { $sum: 1 } } },
    ]),
    Task.aggregate([
      {
        $match: {
          is_deleted: false,
          project_id: { $in: projectIds },
          story_point: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: "$project_id",
          actual_point: { $sum: { $ifNull: ["$story_point", 0] } },
          ai_suggested_point: { $sum: { $ifNull: ["$ai_suggested_point", 0] } },
          tasks_count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const projectMap = new Map(
    projects.map((project) => [String(project._id), project]),
  );
  const boardMap = new Map(
    boardCounts.map((item) => [String(item._id), item.boards_count]),
  );
  const taskMap = new Map(taskStats.map((item) => [String(item._id), item]));
  const candidates = projectIds
    .map((projectId) => {
      const key = String(projectId);
      const stat = taskMap.get(key);
      if (!stat || !stat.tasks_count) return null;
      const boardsCount = Number(boardMap.get(key) || 0);
      const actualPoint = Number(stat.actual_point || 0);
      const aiSuggestedPoint = Number(stat.ai_suggested_point || 0);

      return {
        project_id: key,
        project_name: projectMap.get(key)?.name || "Project chưa đặt tên",
        ai_suggested_point: aiSuggestedPoint,
        actual_point: actualPoint,
        tasks_count: Number(stat.tasks_count || 0),
        boards_count: boardsCount,
        score:
          boardsCount * 100000 +
          Number(stat.tasks_count || 0) * 100 +
          actualPoint,
      };
    })
    .filter(Boolean);

  if (!candidates.length) return [];

  const maxScore = Math.max(...candidates.map((item) => item.score));
  const bestCandidates = candidates.filter((item) => item.score === maxScore);
  const selected =
    bestCandidates[Math.floor(Math.random() * bestCandidates.length)];

  return [
    {
      project_id: selected.project_id,
      project_name: selected.project_name,
      task_title: selected.project_name,
      ai_suggested_point: selected.ai_suggested_point,
      actual_point: selected.actual_point,
      tasks_count: selected.tasks_count,
      boards_count: selected.boards_count,
    },
  ];
};

const getManagerMetrics = async (userId, queryParams) => {
  const manager = await User.findById(userId)
    .select("_id department_id team_id full_name")
    .lean();
  const departmentId = manager?.department_id;
  const departmentTeams = departmentId
    ? await Team.find({ department_id: departmentId, is_deleted: false })
        .select("_id name code")
        .sort({ name: 1 })
        .lean()
    : [];

  if (!manager || !departmentId) return emptyManagerPayload(departmentTeams);

  const projectIds = await getManagerProjectIds(userId, departmentId);
  if (!projectIds.length) return emptyManagerPayload(departmentTeams);

  const [teamWorkload, deadlineStats, atRiskTasks, aiEfficiency] =
    await Promise.all([
      buildTeamWorkload(departmentId, projectIds),
      buildDeadlineStatus(projectIds),
      buildAtRiskTasks(projectIds),
      buildAiEfficiency(projectIds),
    ]);

  return {
    team_workload_capacity: teamWorkload,
    team_deadline_status: {
      on_track: deadlineStats.on_track || 0,
      at_risk: deadlineStats.at_risk || 0,
      overdue: deadlineStats.overdue || 0,
    },
    at_risk_tasks: atRiskTasks,
    ai_efficiency: aiEfficiency,
  };
};

const getMemberMetrics = async (userId, queryParams) => {
  const userObjectId = toObjectId(userId) || userId;
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const contributionRaw = await Task.aggregate([
    {
      $match: {
        $or: [
          { assignee_id: userObjectId },
          { assignees_user_id: userObjectId },
        ],
        is_deleted: false,
      },
    },
    {
      $lookup: {
        from: "taskdeadlines",
        localField: "_id",
        foreignField: "task_id",
        as: "dl",
      },
    },
    { $unwind: { path: "$dl", preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: null,
        total_assigned: { $sum: 1 },
        tasks_completed_this_week: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$is_done", true] },
                  { $gte: ["$dl.actual_completed_at", sevenDaysAgo] },
                ],
              },
              1,
              0,
            ],
          },
        },
        total_completed: {
          $sum: { $cond: [{ $eq: ["$is_done", true] }, 1, 0] },
        },
        on_time_completed: {
          $sum: {
            $cond: [{ $eq: ["$dl.completion_status", "ON_TIME"] }, 1, 0],
          },
        },
      },
    },
  ]);

  const cInfo = contributionRaw[0] || {
    total_assigned: 0,
    tasks_completed_this_week: 0,
    total_completed: 0,
    on_time_completed: 0,
  };
  const onTimeRate =
    cInfo.total_completed > 0
      ? parseFloat(
          ((cInfo.on_time_completed / cInfo.total_completed) * 100).toFixed(1),
        )
      : 0;

  const tasks = await Task.find({
    $or: [{ assignee_id: userObjectId }, { assignees_user_id: userObjectId }],
    is_done: false,
    is_deleted: false,
    priority: { $in: ["HIGH", "CRITICAL", "URGENT"] },
  })
    .select("_id title priority story_point")
    .lean();

  const taskIds = tasks.map((task) => task._id);
  const deadlines = await TaskDeadline.find({
    task_id: { $in: taskIds },
  }).lean();

  const myFocusBoard = tasks.map((task) => {
    const deadline = deadlines.find(
      (item) => String(item.task_id) === String(task._id),
    );
    let status = "ON_TRACK";

    if (deadline) {
      status =
        deadline.is_overdue || new Date(deadline.due_date) < now
          ? "OVERDUE"
          : new Date(deadline.due_date) <
              new Date(now.getTime() + 24 * 60 * 60 * 1000)
            ? "AT_RISK"
            : "ON_TRACK";
    }

    return {
      task_id: task._id,
      title: task.title,
      priority: task.priority,
      story_point: task.story_point,
      deadline_status: status,
      due_date: deadline ? deadline.due_date : null,
      extensions_used: deadline ? deadline.extension_count : 0,
      extension_limit: deadline ? deadline.extension_limit : 2,
    };
  });

  myFocusBoard.sort(
    (a, b) =>
      new Date(a.due_date || "2099-01-01") -
      new Date(b.due_date || "2099-01-01"),
  );

  return {
    my_contribution: {
      tasks_completed_this_week: cInfo.tasks_completed_this_week,
      total_assigned: cInfo.total_assigned,
      on_time_rate: onTimeRate,
    },
    my_focus_board: myFocusBoard.slice(0, 5),
  };
};
