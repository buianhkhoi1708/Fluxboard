const projectMemberService = require('../services/projectMember.service');

exports.getMembers = async (req, res, next) => {
    try {
        const data = await projectMemberService.getMembers(req.params.projectId);
        res.status(200).json({ success: true, code: 'SUCCESS', data });
    } catch (error) { next(error); }
};

exports.addMember = async (req, res, next) => {
    try {
        const data = await projectMemberService.addMember(req.params.projectId, req.body, req.user);
        res.status(201).json({ success: true, message: 'Đã thêm thành viên.', data });
    } catch (error) { next(error); }
};

exports.updateMember = async (req, res, next) => {
    try {
        const data = await projectMemberService.updateMember(req.params.projectId, req.params.userId, req.body, req.user);
        res.status(200).json({ success: true, message: 'Cập nhật thành công.', data });
    } catch (error) { next(error); }
};

exports.removeMember = async (req, res, next) => {
    try {
        await projectMemberService.removeMember(req.params.projectId, req.params.userId, req.user);
        res.status(200).json({ success: true, message: 'Đã xóa thành viên.' });
    } catch (error) { next(error); }
};