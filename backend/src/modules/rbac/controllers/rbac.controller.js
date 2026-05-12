const Role = require('../models/role.model');
const Permission = require('../models/permission.model');

exports.createPermission = async (req, res, next) => {
    try {
        const permission = await Permission.create(req.body);
        res.status(201).json({ success: true, data: permission });
    } catch (error) { next(error); }
};

exports.getRoles = async (req, res, next) => {
    try {
        const roles = await Role.find().populate('permission_ids').lean();
        res.status(200).json({ success: true, data: roles });
    } catch (error) { next(error); }
};