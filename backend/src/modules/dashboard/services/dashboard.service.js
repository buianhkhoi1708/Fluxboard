const Task = require('../../task/models/task.model');
const TaskDeadline = require('../../deadline/models/taskDeadline.model');
const User = require('../../user/models/user.model');
const Department = require('../../department/models/department.model');
const Team = require('../../team/models/team.model');
const Role = require('../../rbac/models/role.model');
const mongoose = require('mongoose');

// Bộ nhớ Cache nội bộ để lưu trữ KPI ít biến động (thay thế Redis)
const kpiCache = new Map();
const CACHE_TTL = 15 * 60 * 1000; // 15 phút

exports.getMetricsByRole = async (jwtUser, queryParams) => {
    let roleNames = ['MEMBER']; 
    const userId = jwtUser._id || jwtUser.id;

    const fullUser = await User.findById(userId).lean();

    if (fullUser && fullUser.role_ids && fullUser.role_ids.length > 0) {
        const roles = await Role.find({ _id: { $in: fullUser.role_ids } }).select('name').lean();
        roleNames = roles.map(r => r.name);
    }

    const systemRoles = ['SYSTEM_ADMIN', 'ADMIN'];
    const managerRoles = ['PROJECT_ADMIN', 'PM', 'LEAD', 'MANAGER'];

    const hasSystemRole = roleNames.some(r => systemRoles.includes(r));
    const hasManagerRole = roleNames.some(r => managerRoles.includes(r));

    if (hasSystemRole) {
        return await getSystemAdminMetrics(queryParams);
    } else if (hasManagerRole) {
        return await getManagerMetrics(userId, fullUser?.team_id, queryParams);
    } else {
        return await getMemberMetrics(userId, queryParams);
    }
};

// ==========================================
// 1. ROLE: SYSTEM ADMIN
// ==========================================
const getSystemAdminMetrics = async (queryParams) => {
    const now = new Date();
    let orgKpi;

    if (kpiCache.has('orgKpi') && kpiCache.get('orgKpi').expires > now.getTime()) {
        orgKpi = kpiCache.get('orgKpi').data;
    } else {
        const [totalUsers, totalDepartments, totalTeams] = await Promise.all([
            User.countDocuments({ status: 'ACTIVE', is_deleted: false }),
            Department.countDocuments({ is_deleted: false }),
            Team.countDocuments({ is_deleted: false })
        ]);
        orgKpi = { total_active_members: totalUsers, total_departments: totalDepartments, total_teams: totalTeams };
        kpiCache.set('orgKpi', { data: orgKpi, expires: now.getTime() + CACHE_TTL });
    }
    
    // Aggregation phân bổ theo phòng ban và sức khỏe deadline
    const deptPerformance = await Task.aggregate([
        { $match: { is_deleted: false } },
        { $lookup: { from: 'taskdeadlines', localField: '_id', foreignField: 'task_id', as: 'dl' } },
        { $unwind: { path: '$dl', preserveNullAndEmptyArrays: true } },
        { $lookup: { from: 'users', localField: 'assignee_id', foreignField: '_id', as: 'user' } },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        { $lookup: { from: 'departments', localField: 'user.department_id', foreignField: '_id', as: 'dept' } },
        { $unwind: { path: '$dept', preserveNullAndEmptyArrays: true } },
        {
            $group: {
                _id: '$dept._id',
                department_name: { $first: { $ifNull: ['$dept.name', 'Unassigned'] } },
                total_tasks: { $sum: 1 },
                completed_on_time: { 
                    $sum: { $cond: [{ $eq: ['$dl.completion_status', 'ON_TIME'] }, 1, 0] } 
                },
                overdue_tasks: { 
                    $sum: { $cond: [{ $eq: ['$dl.is_overdue', true] }, 1, 0] } 
                },
                at_risk_tasks: {
                    $sum: { 
                        $cond: [
                            { $and: [
                                { $eq: ['$is_done', false] }, 
                                { $eq: ['$dl.is_overdue', false] },
                                { $lt: ['$dl.due_date', new Date(now.getTime() + 24 * 60 * 60 * 1000)] }
                            ]}, 1, 0
                        ]
                    }
                },
                on_track_tasks: {
                    $sum: { 
                        $cond: [
                            { $and: [
                                { $eq: ['$is_done', false] }, 
                                { $eq: ['$dl.is_overdue', false] },
                                { $gte: ['$dl.due_date', new Date(now.getTime() + 24 * 60 * 60 * 1000)] }
                            ]}, 1, 0
                        ]
                    }
                },
                extensions_count: { $sum: { $ifNull: ['$dl.extension_count', 0] } }
            }
        },
        {
            $project: {
                department_id: '$_id',
                _id: 0,
                department_name: 1,
                overdue_tasks: 1,
                on_time_rate: {
                    $cond: [
                        { $eq: ['$total_tasks', 0] }, 0,
                        { $round: [{ $multiply: [{ $divide: ['$completed_on_time', '$total_tasks'] }, 100] }, 1] }
                    ]
                },
                at_risk_tasks: 1,
                on_track_tasks: 1,
                extensions_count: 1
            }
        }
    ]);

    let onTrack = 0, atRisk = 0, overdue = 0, totalExtensions = 0;
    const departmentResult = deptPerformance.map(dept => {
        onTrack += dept.on_track_tasks;
        atRisk += dept.at_risk_tasks;
        overdue += dept.overdue_tasks;
        totalExtensions += dept.extensions_count;
        return {
            department_id: dept.department_id || "unassigned",
            department_name: dept.department_name,
            on_time_rate: dept.on_time_rate,
            overdue_tasks: dept.overdue_tasks
        };
    });

    return {
        organization_kpi: orgKpi,
        company_deadline_health: {
            on_track: onTrack,
            at_risk: atRisk,
            overdue: overdue,
            total_extensions_this_week: totalExtensions 
        },
        department_performance: departmentResult,
        critical_audit_logs: [
            { id: "act-001", actor: "System", message: "Hệ thống đang hoạt động ổn định", created_at: now.toISOString() }
        ]
    };
};

// ==========================================
// 2. ROLE: MANAGER / TEAM LEAD
// ==========================================
const getManagerMetrics = async (userId, userTeamId, queryParams) => {
    const teamId = queryParams.team_id || userTeamId; 
    const now = new Date();
    
    const teamUsers = teamId && mongoose.Types.ObjectId.isValid(teamId) 
        ? await User.find({ team_id: teamId, is_deleted: false, status: 'ACTIVE' }).select('_id').lean()
        : [];
    const teamUserIds = teamUsers.map(u => u._id);

    // Tính toán Workload (Dựa trên Story Points hoặc số lượng Task chưa hoàn thành)
    const teamWorkload = await Task.aggregate([
        { $match: { is_done: false, is_deleted: false, assignee_id: { $in: teamUserIds } } },
        { $lookup: { from: 'taskdeadlines', localField: '_id', foreignField: 'task_id', as: 'dl' } },
        { $unwind: { path: '$dl', preserveNullAndEmptyArrays: true } },
        { $lookup: { from: 'users', localField: 'assignee_id', foreignField: '_id', as: 'assignee' } },
        { $unwind: '$assignee' },
        { 
            $group: { 
                _id: '$assignee_id', 
                full_name: { $first: '$assignee.full_name' },
                assigned_points: { $sum: { $ifNull: ['$story_point', 1] } },
                tasks_overdue: { $sum: { $cond: [{ $eq: ['$dl.is_overdue', true] }, 1, 0] } }
            } 
        },
        {
            $project: {
                _id: 0, user_id: '$_id', full_name: 1, assigned_points: 1, tasks_overdue: 1
            }
        }
    ]);

    // Truy vấn trạng thái deadline
    const deadlineStats = await TaskDeadline.aggregate([
        { 
            $lookup: { 
                from: 'tasks', localField: 'task_id', foreignField: '_id', as: 'task' 
            } 
        },
        { $unwind: '$task' },
        { $match: { 'task.is_deleted': false, 'task.assignee_id': { $in: teamUserIds }, 'task.is_done': false } },
        {
            $group: {
                _id: null,
                overdue: { $sum: { $cond: [{ $eq: ['$is_overdue', true] }, 1, 0] } },
                at_risk: { 
                    $sum: { 
                        $cond: [
                            { $and: [
                                { $eq: ['$is_overdue', false] },
                                { $lt: ['$due_date', new Date(now.getTime() + 24 * 60 * 60 * 1000)] }
                            ]}, 1, 0
                        ] 
                    } 
                },
                on_track: { 
                    $sum: { 
                        $cond: [
                            { $and: [
                                { $eq: ['$is_overdue', false] },
                                { $gte: ['$due_date', new Date(now.getTime() + 24 * 60 * 60 * 1000)] }
                            ]}, 1, 0
                        ] 
                    } 
                }
            }
        }
    ]);

    const stats = deadlineStats[0] || { on_track: 0, at_risk: 0, overdue: 0 };

    // Truy xuất các Task At Risk hoặc Overdue
    const atRiskRaw = await TaskDeadline.find({
        is_deleted: false,
        $or: [
            { is_overdue: true },
            { due_date: { $lte: new Date(now.getTime() + 24 * 60 * 60 * 1000) } }
        ]
    }).populate({
        path: 'task_id',
        match: { is_deleted: false, is_done: false, assignee_id: { $in: teamUserIds } },
        populate: { path: 'assignee_id', select: 'full_name' }
    }).lean();

    const atRiskTasks = atRiskRaw
        .filter(d => d.task_id)
        .map(d => {
            const isOverdue = d.is_overdue || new Date(d.due_date) < now;
            const hoursLeft = Math.max(0, Math.floor((new Date(d.due_date) - now) / (1000 * 60 * 60)));
            
            return {
                task_id: d.task_id._id,
                title: d.task_id.title,
                assignee_name: d.task_id.assignee_id ? d.task_id.assignee_id.full_name : 'Unassigned',
                due_date: d.due_date,
                status: isOverdue ? "OVERDUE" : "AT_RISK",
                hours_left: isOverdue ? 0 : hoursLeft
            };
        });

    return {
        team_workload: teamWorkload,
        team_deadline_status: {
            on_track: stats.on_track,
            at_risk: stats.at_risk,
            overdue: stats.overdue
        },
        at_risk_tasks: atRiskTasks
    };
};

// ==========================================
// 3. ROLE: MEMBER
// ==========================================
const getMemberMetrics = async (userId, queryParams) => {
    const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    const now = new Date();

    // Xác định Time Range (Tuần hiện tại)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const contributionRaw = await Task.aggregate([
        { $match: { assignee_id: userObjectId, is_deleted: false } },
        { $lookup: { from: 'taskdeadlines', localField: '_id', foreignField: 'task_id', as: 'dl' } },
        { $unwind: { path: '$dl', preserveNullAndEmptyArrays: true } },
        { 
            $group: {
                _id: null,
                total_assigned: { $sum: 1 },
                tasks_completed_this_week: { 
                    $sum: { 
                        $cond: [
                            { $and: [
                                { $eq: ['$is_done', true] },
                                { $gte: ['$dl.actual_completed_at', sevenDaysAgo] }
                            ]}, 1, 0
                        ] 
                    } 
                },
                total_completed: { $sum: { $cond: [{ $eq: ['$is_done', true] }, 1, 0] } },
                on_time_completed: { 
                    $sum: { $cond: [{ $eq: ['$dl.completion_status', 'ON_TIME'] }, 1, 0] } 
                }
            }
        }
    ]);

    const cInfo = contributionRaw[0] || { total_assigned: 0, tasks_completed_this_week: 0, total_completed: 0, on_time_completed: 0 };
    const onTimeRate = cInfo.total_completed > 0 ? parseFloat(((cInfo.on_time_completed / cInfo.total_completed) * 100).toFixed(1)) : 0;

    // Truy vấn Focus Board (High/Critical/Urgent)
    const tasks = await Task.find({
        assignee_id: userId,
        is_done: false,
        is_deleted: false,
        priority: { $in: ['HIGH', 'CRITICAL', 'URGENT'] } 
    }).select('_id title priority').lean();

    const taskIds = tasks.map(t => t._id);
    const deadlines = await TaskDeadline.find({ task_id: { $in: taskIds } }).lean();

    const myFocusBoard = tasks.map(t => {
        const d = deadlines.find(dl => dl.task_id.toString() === t._id.toString());
        let status = "ON_TRACK";
        if (d) {
            status = (d.is_overdue || new Date(d.due_date) < now) ? "OVERDUE" : 
                     (new Date(d.due_date) < new Date(now.getTime() + 24 * 60 * 60 * 1000) ? "AT_RISK" : "ON_TRACK");
        }

        return {
            task_id: t._id,
            title: t.title,
            priority: t.priority,
            deadline_status: status,
            due_date: d ? d.due_date : null,
            extensions_used: d ? d.extension_count : 0,
            extension_limit: d ? d.extension_limit : 2
        };
    });

    myFocusBoard.sort((a, b) => new Date(a.due_date || '2099-01-01') - new Date(b.due_date || '2099-01-01'));

    return {
        my_contribution: {
            tasks_completed_this_week: cInfo.tasks_completed_this_week,
            total_assigned: cInfo.total_assigned,
            on_time_rate: onTimeRate
        },
        my_focus_board: myFocusBoard.slice(0, 5) 
    };
};