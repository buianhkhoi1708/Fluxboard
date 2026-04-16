const authService = require('../services/auth.service');

exports.login = async (req, res, next) => {
    try {
        const data = await authService.login(req.body.email, req.body.password);
        res.status(200).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};