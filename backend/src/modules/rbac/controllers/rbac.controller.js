const Role = require('../models/role.model');
const Permission = require('../models/permission.model');
const AppError = require('../../../common/exceptions/AppError');

// Lấy danh sách Roles và sắp xếp theo thời gian tạo (Role tạo sau cùng nằm ở cuối danh sách)
exports.getRoles = async (req, res, next) => {
    try {
        const roles = await Role.find()
            .populate('permission_ids')
            .sort({ created_at: 1 }) 
            .lean();
        res.status(200).json({ success: true, data: roles });
    } catch (error) { next(error); }
};

// Lấy toàn bộ Permissions
exports.getPermissions = async (req, res, next) => {
    try {
        const permissions = await Permission.find().lean();
        res.status(200).json({ success: true, data: permissions });
    } catch (error) { next(error); }
};

// Tạo Role mới từ giao diện
exports.createRole = async (req, res, next) => {
    try {
        const { name, scope, description } = req.body;
        if (!name || !scope) throw new AppError('Name and scope are required', 400);

        const role = await Role.create({ name, scope, description, permission_ids: [] });
        res.status(201).json({ success: true, data: role });
    } catch (error) { 
        if (error.code === 11000) return next(new AppError('Role name already exists', 400));
        next(error); 
    }
};

// Hàm tạo Permission thủ công
exports.createPermission = async (req, res, next) => {
    try {
        const permission = await Permission.create(req.body);
        res.status(201).json({ success: true, data: permission });
    } catch (error) { next(error); }
};

// Bật quyền cho Role
// Bật quyền cho Role
exports.assignPermission = async (req, res, next) => {
    try {
        const { roleId, permissionId } = req.params;
        const role = await Role.findByIdAndUpdate(
            roleId,
            { $addToSet: { permission_ids: permissionId } }, 
            { returnDocument: 'after' } // Đã sửa
        );
        if (!role) throw new AppError('Role not found', 404);
        res.status(200).json({ success: true, data: role });
    } catch (error) { next(error); }
};

// Tắt quyền của Role
exports.removePermission = async (req, res, next) => {
    try {
        const { roleId, permissionId } = req.params;
        const role = await Role.findByIdAndUpdate(
            roleId,
            { $pull: { permission_ids: permissionId } }, 
            { new: true }
        );
        if (!role) throw new AppError('Role not found', 404);
        res.status(200).json({ success: true, data: role });
    } catch (error) { next(error); }
};