const teamService = require("../services/team.service");

exports.createTeam = async (req, res, next) => {
  try {
    const team = await teamService.createTeam(req.body);
    res.status(201).json({ success: true, data: team });
  } catch (error) {
    next(error);
  }
};

exports.getTeamsByDepartment = async (req, res, next) => {
  try {
    const { departmentId } = req.params;

    const teams = await teamService.getTeamsByDepartment(departmentId);

    res.status(200).json({ success: true, data: teams });
  } catch (error) {
    next(error);
  }
};
