const Role = require("../models/role.model");
const Permission = require("../models/permission.model");
const AppError = require("../../../common/exceptions/AppError");

exports.getRoles = async (req, res, next) => {
  try {
    const roles = await Role.find()
      .populate("permission_ids")
      .sort({ created_at: 1 })
      .lean();
    res.status(200).json({ success: true, data: roles });
  } catch (error) {
    next(error);
  }
};

exports.getPermissions = async (req, res, next) => {
  try {
    const permissions = await Permission.find().lean();
    res.status(200).json({ success: true, data: permissions });
  } catch (error) {
    next(error);
  }
};

exports.createRole = async (req, res, next) => {
  try {
    const { name, scope, description } = req.body;
    if (!name || !scope) throw new AppError("Name and scope are required", 400);

    const role = await Role.create({
      name,
      scope,
      description,
      permission_ids: [],
    });
    res.status(201).json({ success: true, data: role });
  } catch (error) {
    if (error.code === 11000)
      return next(new AppError("Role name already exists", 400));
    next(error);
  }
};

exports.createPermission = async (req, res, next) => {
  try {
    const permission = await Permission.create(req.body);
    res.status(201).json({ success: true, data: permission });
  } catch (error) {
    next(error);
  }
};

exports.assignPermission = async (req, res, next) => {
  try {
    const { roleId, permissionId } = req.params;
    const role = await Role.findByIdAndUpdate(
      roleId,
      { $addToSet: { permission_ids: permissionId } },
      { returnDocument: "after" },
    );
    if (!role) throw new AppError("Role not found", 404);
    res.status(200).json({ success: true, data: role });
  } catch (error) {
    next(error);
  }
};

exports.removePermission = async (req, res, next) => {
  try {
    const { roleId, permissionId } = req.params;
    const role = await Role.findByIdAndUpdate(
      roleId,
      { $pull: { permission_ids: permissionId } },
      { new: true },
    );
    if (!role) throw new AppError("Role not found", 404);
    res.status(200).json({ success: true, data: role });
  } catch (error) {
    next(error);
  }
};

exports.getPermissionsByRole = async (req, res, next) => {
  try {
    const { roleId } = req.params;

    const role = await Role.findById(roleId).populate("permission_ids").lean();

    if (!role) throw new AppError("Role not found", 404);

    res.status(200).json({ success: true, data: role.permission_ids });
  } catch (error) {
    next(error);
  }
};
