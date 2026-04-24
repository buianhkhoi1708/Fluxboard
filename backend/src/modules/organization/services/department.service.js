const Department = require('../models/department.model');
const AppError = require('../../../common/exceptions/AppError');

exports.createDepartment = async (data) => {
    return await Department.create(data);
};

exports.getAllDepartments = async () => {
    return await Department.find().populate('manager_id', 'full_name email avatar_url').lean();
};