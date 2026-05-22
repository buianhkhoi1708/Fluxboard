const organizationService = require('../services/organization.service'); // Đường dẫn trỏ tới file service ở trên
const User = require('../../user/models/user.model');

// ==========================================
// 1. LẤY SƠ ĐỒ TỔ CHỨC
// ==========================================
exports.getTree = async (req, res, next) => {
    try {
        const treeData = await organizationService.getOrganizationTree();
        res.status(200).json({ success: true, data: treeData });
    } catch (error) { next(error); }
};

// ==========================================
// 2. DEPARTMENT CONTROLLERS
// ==========================================
exports.createDepartment = async (req, res, next) => {
    try {
        const newDept = await organizationService.createDepartment(req.body);
        res.status(201).json({ success: true, data: newDept, message: 'Tạo phòng ban thành công' });
    } catch (error) { next(error); }
};

exports.updateDepartment = async (req, res, next) => {
    try {
        console.log("🔥 PAYLOAD NHẬN TỪ FRONTEND:", req.body);
        const updatedDept = await organizationService.updateDepartment(req.params.id, req.body);
        res.status(200).json({ success: true, data: updatedDept, message: 'Cập nhật thành công' });
    } catch (error) { next(error); }
};

exports.deleteDepartment = async (req, res, next) => {
    try {
        await organizationService.deleteDepartment(req.params.id);
        res.status(200).json({ success: true, message: 'Đã xóa phòng ban' });
    } catch (error) { next(error); }
};

// ==========================================
// 3. TEAM CONTROLLERS
// ==========================================
exports.createTeam = async (req, res, next) => {
    try {
        const newTeam = await organizationService.createTeam(req.body);
        res.status(201).json({ success: true, data: newTeam, message: 'Tạo nhóm thành công' });
    } catch (error) { next(error); }
};

exports.updateTeam = async (req, res, next) => {
    try {
        const updatedTeam = await organizationService.updateTeam(req.params.teamId, req.body);
        res.status(200).json({ success: true, data: updatedTeam, message: 'Cập nhật nhóm thành công' });
    } catch (error) { next(error); }
};

// ==========================================
// 4. MEMBER ASSIGNMENT CONTROLLERS
// ==========================================
exports.getUnassignedUsers = async (req, res, next) => {
    try {
        const users = await organizationService.getUnassignedUsers();
        res.status(200).json({ success: true, data: users });
    } catch (error) { next(error); }
};

exports.assignToTeam = async (req, res, next) => {
    try {
        const { teamId } = req.params; // PHẢI KHỚP VỚI :teamId trong router
        const { user_id, department_id } = req.body; // PHẢI KHỚP VỚI tên field trong orgApi
        
        await organizationService.assignUserToTeam(user_id, teamId, department_id);
        res.status(200).json({ success: true, message: 'Đã thêm nhân sự vào nhóm' });
    } catch (error) { next(error); }
};

exports.removeUserFromTeam = async (req, res, next) => {
    try {
        const { teamId, userId } = req.params;
        
        await organizationService.removeUserFromTeam(userId, teamId);
        res.status(200).json({ success: true, message: 'Đã xóa nhân sự khỏi nhóm' });
    } catch (error) { next(error); }
};

exports.searchUsers = async (req, res, next) => {
    try {
        // Ép kiểu về String để tránh middleware hoặc Mongoose nhận nhầm là Object/ObjectId
        const keyword = req.query.keyword ? String(req.query.keyword) : '';
        
        const users = await organizationService.searchUsers(keyword);
        
        res.status(200).json({ 
            success: true, 
            data: users 
        });
    } catch (error) { 
        console.error("💥 [SEARCH USERS ERROR]:", error);
        next(error); 
    }
};