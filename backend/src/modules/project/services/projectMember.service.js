const ProjectMember = require('../models/projectMember.model');
const Role = require('../../rbac/models/role.model');
const User = require('../../user/models/user.model');
const { Roles, Scopes } = require('../../rbac/constants/rbac.enum');
const AppError = require('../../../common/exceptions/AppError');

// 1. THÊM THÀNH VIÊN VÀO DỰ ÁN
exports.addMember = async (projectId, userId, roleName = Roles.MEMBER) => {
    // Kiểm tra User có tồn tại không
    const user = await User.findById(userId).lean();
    if (!user) throw new AppError('User không tồn tại', 404);

    // Kiểm tra xem đã là thành viên chưa
    const existingMember = await ProjectMember.findOne({ project_id: projectId, user_id: userId }).lean();
    if (existingMember) throw new AppError('User này đã là thành viên của dự án', 400);

    // Tìm Role ID chuẩn của dự án (Mặc định là MEMBER)
    const role = await Role.findOne({ name: roleName, scope: Scopes.PROJECT }).lean();
    if (!role) throw new AppError(`Không tìm thấy role ${roleName} trong hệ thống`, 500);

    // Lưu vào database
    const newMember = await ProjectMember.create({
        project_id: projectId,
        user_id: userId,
        role_id: role._id
    });

    return newMember;
};

// 2. CẬP NHẬT QUYỀN THÀNH VIÊN (Thăng chức / Giáng chức)
exports.updateMemberRole = async (projectId, userId, newRoleName) => {
    // Tìm Role mới
    const newRole = await Role.findOne({ name: newRoleName, scope: Scopes.PROJECT }).lean();
    if (!newRole) throw new AppError(`Không tìm thấy role ${newRoleName}`, 500);

    // Cập nhật role_id
    const updatedMember = await ProjectMember.findOneAndUpdate(
        { project_id: projectId, user_id: userId },
        { role_id: newRole._id },
        { new: true }
    );

    if (!updatedMember) throw new AppError('Thành viên không có trong dự án này', 404);
    
    return updatedMember;
};

// 3. XÓA THÀNH VIÊN KHỎI DỰ ÁN
exports.removeMember = async (projectId, userId) => {
    const deleted = await ProjectMember.findOneAndDelete({ project_id: projectId, user_id: userId });
    if (!deleted) throw new AppError('Thành viên không có trong dự án này', 404);
    
    return true;
};