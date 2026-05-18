const organizationService = require('../services/organization.service');

exports.getTree = async (req, res, next) => {
    try {
        const tree = await organizationService.getOrganizationTree();
        res.status(200).json({ success: true, data: tree });
    } catch (error) { next(error); }
};