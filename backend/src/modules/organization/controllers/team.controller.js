const teamService = require('../services/team.service');

exports.createTeam = async (req, res, next) => {
    try {
        const team = await teamService.createTeam(req.body);
        res.status(201).json({ success: true, data: team });
    } catch (error) { next(error); }
};

exports.getTeamsByDepartment = async (req, res, next) => {
    try {
        const teams = await teamService.getTeamsByDepartment(req.params.departmentId);
        res.status(200).json({ success: true, data: teams });
    } catch (error) { next(error); }
};