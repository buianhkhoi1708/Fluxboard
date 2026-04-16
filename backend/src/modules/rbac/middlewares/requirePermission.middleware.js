const User = require('../../user/models/user.model');
const AppError = require('../../../common/exceptions/AppError');

const requirePermission = (resource, action) => {
    return async (req, res, next) => {
        try {
            const userId = req.user.id;

            const user = await User.findById(userId)
                .populate({
                    path: 'system_role_ids',
                    populate: {
                        path: 'permission_ids',
                        match: { resource, action },
                        select: '_id resource action'
                    }
                })
                .select('system_role_ids status')
                .lean();

            if (!user || user.status === 'INACTIVE') {
                return next(new AppError('Account is inactive or not found', 403, 'FORBIDDEN'));
            }

            const hasPermission = user.system_role_ids.some(role => 
                role.permission_ids && role.permission_ids.length > 0
            );

            if (!hasPermission) {
                return next(new AppError(`Access denied: Missing permission [${resource}:${action}]`, 403, 'INSUFFICIENT_PERMISSION'));
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

module.exports = requirePermission;