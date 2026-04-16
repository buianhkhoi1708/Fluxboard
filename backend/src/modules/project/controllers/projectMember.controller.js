const ProjectMember = require('../models/projectMember.model');

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