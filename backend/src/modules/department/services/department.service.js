const Department = require('../models/department.model');
const AppError = require('../../../common/exceptions/AppError');

exports.createDepartment = async (data) => {
    const existing = await Department.findOne({ code: data.code });
    if (existing) throw new AppError('Department code already exists', 400, 'DUPLICATE_CODE');
    return await Department.create(data);
};

exports.getAllDepartments = async () => {
    return await Department.find({ is_deleted: false })
        .populate('manager_id', 'full_name email avatar_url')
        .lean();
};

exports.getDepartmentById = async (id) => {
    const dept = await Department.findById(id).populate('manager_id', 'full_name email').lean();
    if (!dept) throw new AppError('Department not found', 404, 'NOT_FOUND');
    return dept;
};