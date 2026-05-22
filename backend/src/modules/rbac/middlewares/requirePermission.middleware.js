const User = require('../../user/models/user.model');
const ProjectMember = require('../../projectMember/models/projectMember.model');
const AppError = require('../../../common/exceptions/AppError');

const requirePermission = (resource, action, scope = 'SYSTEM') => {
    return async (req, res, next) => {
        try {
            const userId = req.user.id;
            let userRoles = [];

            // Lấy thông tin user và hệ thống role qua trường role_id
            const user = await User.findById(userId).populate({
                path: 'role_id',
                populate: { path: 'permission_ids' }
            }).lean();
            
            if (!user || user.status === 'INACTIVE') {
                throw new AppError('Account is inactive or not found', 403, 'FORBIDDEN');
            }

            // 🚀 FIX: BẮT BUỘC ĐƯA VÀO MẢNG NẾU NÓ LÀ OBJECT
            let systemRoles = [];
            if (user.role_id) {
                systemRoles = Array.isArray(user.role_id) ? user.role_id : [user.role_id];
            }
            
            const isSystemAdmin = systemRoles.some(role => role && role.name === 'SYSTEM_ADMIN');
            
            // Đặc quyền tối cao dành cho SYSTEM_ADMIN: Bỏ qua kiểm tra quyền (bypass)
            if (isSystemAdmin) {
                return next(); 
            }

            // Xử lý phân quyền theo phạm vi (scope)
            if (scope === 'SYSTEM') {
                userRoles = systemRoles;
            } else if (scope === 'PROJECT') {
                const projectId = req.params.id || req.params.projectId || req.body.projectId || req.body.project_id;
                
                if (!projectId) {
                    throw new AppError('Project ID is required for project-level permission check', 400);
                }

                const member = await ProjectMember.findOne({ project_id: projectId, user_id: userId })
                    .populate({
                        path: 'role_ids',
                        populate: { path: 'permission_ids' }
                    }).lean();

                if (!member || !member.role_ids) {
                    throw new AppError('You are not a member of this project', 403, 'FORBIDDEN');
                }
                
                // Đảm bảo member.role_ids cũng là mảng cho chắc ăn tuyệt đối
                userRoles = Array.isArray(member.role_ids) ? member.role_ids : [member.role_ids];
            }

            // Trích xuất phẳng danh sách các object permissions từ các vai trò
            const userPermissions = userRoles.flatMap(role => role && role.permission_ids ? role.permission_ids : []);
            
            const hasPermission = userPermissions.some(
                p => p && p.resource === resource && p.action === action && p.scope === scope
            );

            if (!hasPermission) {
                throw new AppError(`Access denied: Missing permission [${resource}:${action}] at ${scope} scope`, 403, 'INSUFFICIENT_PERMISSION');
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

module.exports = requirePermission;
module.exports.requirePermission = requirePermission; // Hỗ trợ cả hai cách import