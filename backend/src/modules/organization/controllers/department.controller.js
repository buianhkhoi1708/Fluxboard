const departmentService = require('../services/department.service');

exports.createDepartment = async (req, res, next) => {
    try {
        const department = await departmentService.createDepartment(req.body);
        res.status(201).json({ success: true, data: department });
    } catch (error) { next(error); }
};

exports.getAllDepartments = async (req, res, next) => {
    try {
        const departments = await departmentService.getAllDepartments();
        res.status(200).json({ success: true, data: departments });
    } catch (error) { next(error); }
};