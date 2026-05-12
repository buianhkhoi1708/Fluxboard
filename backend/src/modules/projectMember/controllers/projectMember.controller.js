const projectMemberService = require('../services/projectMember.service');
const AppError = require('../../../common/exceptions/AppError');

// 1. THÊM THÀNH VIÊN
exports.addMember = async (req, res, next) => {
    try {
        // Nhận role_name (VD: 'MEMBER', 'LEAD') từ client thay vì role cứng
        const { project_id, user_id, role_name } = req.body; 
        
        if (!project_id || !user_id) {
            throw new AppError('project_id và user_id là bắt buộc', 400);
        }

        const member = await projectMemberService.addMember(project_id, user_id, role_name);
        res.status(201).json({ success: true, data: member, message: 'Đã thêm thành viên thành công' });
    } catch (error) { 
        next(error); 
    }
};

// 2. XÓA THÀNH VIÊN
exports.removeMember = async (req, res, next) => {
    try {
        const { project_id, user_id } = req.body;
        await projectMemberService.removeMember(project_id, user_id);
        res.status(200).json({ success: true, message: 'Đã xóa thành viên khỏi dự án' });
    } catch (error) { 
        next(error); 
    }
};

// 3. THAY ĐỔI VAI TRÒ (THĂNG CHỨC / GIÁNG CHỨC)
exports.updateMemberRole = async (req, res, next) => {
    try {
        const { projectId, userId } = req.params;
        const { role_name } = req.body; // VD: Truyền lên 'LEAD' hoặc 'VIEWER'

        if (!role_name) throw new AppError('Vui lòng cung cấp role_name mới', 400);

        const member = await projectMemberService.updateMemberRole(projectId, userId, role_name);
        res.status(200).json({ success: true, data: member, message: 'Đã cập nhật vai trò thành công' });
    } catch (error) { 
        next(error); 
    }
};