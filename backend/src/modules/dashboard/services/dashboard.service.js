const Task = require('../../task/models/task.model');
const User = require('../../user/models/user.model');
const Department = require('../../department/models/department.model');
const Team = require('../../team/models/team.model');
const Role = require('../../rbac/models/role.model');
const mongoose = require('mongoose');

exports.getMetricsByRole = async (jwtUser, queryParams) => {
    let roleName = 'MEMBER'; 
    const userId = jwtUser._id || jwtUser.id;

    // 1. Móc thẳng xuống DB lấy thông tin User gốc (đảm bảo an toàn tuyệt đối về quyền)
    const fullUser = await User.findById(userId).lean();

    if (fullUser) {
        // 2. Dò Role từ bản ghi User vừa tìm được
        if (fullUser.role_id) {
            const roleDoc = await Role.findById(fullUser.role_id).select('name').lean();
            if (roleDoc) {
                roleName = roleDoc.name;
            }
        } else if (fullUser.role) {
            roleName = fullUser.role.name || fullUser.role;
        }
    }

    // 3. ĐIỀU HƯỚNG DASHBOARD THEO ROLE 
    const systemRoles = ['SYSTEM_ADMIN', 'ADMIN'];
    const managerRoles = ['PROJECT_ADMIN', 'PM', 'LEAD', 'MANAGER'];

    if (systemRoles.includes(roleName)) {
        return await getSystemAdminMetrics(queryParams);
    } else if (managerRoles.includes(roleName)) {
        return await getManagerMetrics(userId, fullUser?.team_id, queryParams);
    } else {
        return await getMemberMetrics(userId, queryParams);
    }
};

// ==========================================
// 1. DASHBOARD CHO SYSTEM ADMIN & ADMIN
// ==========================================
const getSystemAdminMetrics = async (queryParams) => {
    const [totalUsers, totalDepartments, totalTeams] = await Promise.all([
        User.countDocuments({ is_deleted: false }),
        Department.countDocuments({ is_deleted: false }),
        Team.countDocuments({ is_deleted: false })
    ]);

    const now = new Date();
    
    const taskAggregation = await Task.aggregate([
        { $match: { is_deleted: false } },
        { $lookup: { from: 'users', localField: 'assignee_id', foreignField: '_id', as: 'assignee' } },
        { $unwind: { path: '$assignee', preserveNullAndEmptyArrays: true } },
        {
            $group: {
                _id: '$assignee.department_id',
                total_points: { $sum: { $ifNull: ['$story_point', 0] } },
                completed_points: { 
                    $sum: { $cond: [{ $eq: ['$is_done', true] }, { $ifNull: ['$story_point', 0] }, 0] } 
                },
                overdue_tasks: {
                    $sum: { $cond: [{ $and: [{ $lt: ['$due_date', now] }, { $eq: ['$is_done', false] }] }, 1, 0] }
                },
                on_track_tasks: {
                    $sum: { $cond: [{ $gte: ['$due_date', now] }, 1, 0] }
                }
            }
        },
        { $lookup: { from: 'departments', localField: '_id', foreignField: '_id', as: 'dept_info' } },
        { $unwind: { path: '$dept_info', preserveNullAndEmptyArrays: true } }
    ]);

    let onTrack = 0, overdue = 0;
    const deptDistribution = taskAggregation.map(dept => {
        onTrack += dept.on_track_tasks;
        overdue += dept.overdue_tasks;
        
        return {
            department_id: dept._id || "unassigned",
            department_name: dept.dept_info ? dept.dept_info.name : "Chưa phân bổ",
            total_points: dept.total_points,
            completed_points: dept.completed_points,
            overdue_tasks: dept.overdue_tasks
        };
    });

    return {
        organization_kpi: {
            total_users: totalUsers,
            total_departments: totalDepartments,
            total_teams: totalTeams
        },
        company_deadline_health: {
            on_track: onTrack,
            at_risk: 0, 
            overdue: overdue,
            total_extensions: 0 
        },
        department_points_distribution: deptDistribution
    };
};

// ==========================================
// 2. DASHBOARD CHO MANAGER / TEAM LEAD / PM
// ==========================================
const getManagerMetrics = async (userId, userTeamId, queryParams) => {
    const teamId = queryParams.team_id || userTeamId; 
    const now = new Date();
    
    const matchStage = { is_done: false, assignee_id: { $ne: null }, is_deleted: false };

    const pipeline = [
        { $match: matchStage },
        { $lookup: { from: 'users', localField: 'assignee_id', foreignField: '_id', as: 'assignee' } },
        { $unwind: '$assignee' }
    ];

    if (teamId && mongoose.Types.ObjectId.isValid(teamId)) {
        pipeline.push({ $match: { 'assignee.team_id': new mongoose.Types.ObjectId(teamId) } });
    }

    pipeline.push({ 
        $group: { 
            _id: '$assignee_id', 
            full_name: { $first: '$assignee.full_name' },
            current_points: { $sum: { $ifNull: ['$story_point', 0] } } 
        } 
    });

    const workload = await Task.aggregate(pipeline);

    const teamWorkload = workload.map(w => ({
        user_id: w._id,
        full_name: w.full_name,
        current_points: w.current_points,
        status: w.current_points > 20 ? "OVERLOADED" : "AVAILABLE" 
    }));

    const atRiskTasksRaw = await Task.find({
        due_date: { $lte: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000) }, 
        is_done: false,
        is_deleted: false
    }).select('title story_point priority due_date extension_count').lean();

    const atRiskTasks = atRiskTasksRaw.map(t => ({
        task_id: t._id,
        title: t.title,
        story_point: t.story_point || 0,
        priority: t.priority,
        due_date: t.due_date,
        deadline_status: new Date(t.due_date) < now ? "OVERDUE" : "AT_RISK",
        extension_count: t.extension_count || 0
    }));

    return {
        team_workload_capacity: teamWorkload,
        at_risk_tasks: atRiskTasks,
        ai_efficiency: [
            { task_title: "Fix bug UI", ai_suggested_point: 3, actual_point: 5 } 
        ]
    };
};

// ==========================================
// 3. DASHBOARD CHO MEMBER (CÁ NHÂN)
// ==========================================
const getMemberMetrics = async (userId, queryParams) => {
    const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;

    const contributionRaw = await Task.aggregate([
        { $match: { assignee_id: userObjectId, is_deleted: false } },
        { 
            $group: {
                _id: null,
                total_assigned: { $sum: 1 },
                completed_tasks: { $sum: { $cond: [{ $eq: ['$is_done', true] }, 1, 0] } }
            }
        }
    ]);

    const contribution = contributionRaw[0] || { total_assigned: 0, completed_tasks: 0 };
    
    const focusTasksRaw = await Task.find({
        assignee_id: userId,
        is_done: false,
        is_deleted: false,
        priority: { $in: ['HIGH', 'CRITICAL', 'URGENT'] } 
    })
    .sort({ due_date: 1 }) 
    .limit(5)
    .select('title priority story_point due_date extension_count')
    .lean();

    const now = new Date();
    const myFocusBoard = focusTasksRaw.map(t => ({
        task_id: t._id,
        title: t.title,
        priority: t.priority,
        story_point: t.story_point || 0,
        due_date: t.due_date,
        deadline_status: new Date(t.due_date) < now ? "OVERDUE" : "AT_RISK",
        extensions_used: t.extension_count || 0
    }));

    return {
        my_contribution: {
            completed_tasks: contribution.completed_tasks,
            total_assigned: contribution.total_assigned
        },
        my_focus_board: myFocusBoard
    };
};