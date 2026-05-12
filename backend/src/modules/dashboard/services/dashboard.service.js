const Task = require('../../board/models/task.model');
const Project = require('../../project/models/project.model');
const User = require('../../user/models/user.model');

exports.getAdminDashboard = async () => {
    const [totalUsers, totalProjects, totalTasks] = await Promise.all([
        User.countDocuments(),
        Project.countDocuments(),
        Task.countDocuments()
    ]);
    return { totalUsers, totalProjects, totalTasks };
};

exports.getMemberDashboard = async (userId) => {
    const taskStats = await Task.aggregate([
        { $match: { assignee_id: userId } },
        { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);

    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const upcomingTasks = await Task.find({
        assignee_id: userId,
        due_date: { $gte: new Date(), $lte: threeDaysFromNow }
    }).select('title priority due_date board_id').lean();

    return { stats: taskStats, upcomingTasks };
};