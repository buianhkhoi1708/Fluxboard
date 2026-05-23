const teamService = require('../services/team.service');

exports.createTeam = async (req, res, next) => {
    try {
        const team = await teamService.createTeam(req.body);
        res.status(201).json({ success: true, data: team });
    } catch (error) { next(error); }
};

exports.getTeamsByDepartment = async (req, res, next) => {
    try {
        const { departmentId } = req.params;
        
        // Gọi xuống Service để nấu dữ liệu
        const teams = await teamService.getTeamsByDepartment(departmentId);
        
        // Trả về cho Frontend
        res.status(200).json({ success: true, data: teams });
    } catch (error) { 
        next(error); // Ở ĐÂY DÙNG NEXT THÌ KHÔNG BAO GIỜ LỖI NHÉ!
    }
};