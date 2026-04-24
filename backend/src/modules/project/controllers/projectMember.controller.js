const ProjectMember = require('../models/projectMember.model');
const AppError = require('../../../common/exceptions/AppError');

exports.addMember = async (req, res, next) => {
    try {
        const { project_id, user_id, role } = req.body;
        const member = await ProjectMember.create({ project_id, user_id, role });
        res.status(201).json({ success: true, data: member });
    } catch (error) { next(error); }
};

exports.removeMember = async (req, res, next) => {
    try {
        const { project_id, user_id } = req.body;
        await ProjectMember.findOneAndDelete({ project_id, user_id });
        res.status(200).json({ success: true, message: 'Member removed' });
    } catch (error) { next(error); }
};

exports.updateMemberRole = async (req, res, next) => {
    try {
        const { projectId, userId } = req.params;
        const { role } = req.body; // 'MANAGER', 'LEAD', 'MEMBER', 'VIEWER'

        const member = await ProjectMember.findOneAndUpdate(
            { project_id: projectId, user_id: userId },
            { role: role },
            { new: true }
        ).lean();

        if (!member) throw new AppError('Member not found in this project', 404, 'NOT_FOUND');

        res.status(200).json({ success: true, data: member, message: 'Role updated' });
    } catch (error) { next(error); }
};