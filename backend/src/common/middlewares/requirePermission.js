const User = require('../../modules/user/models/user.model');
const ProjectMember = require('../../modules/project/models/projectMember.model');
const AppError = require('../exceptions/AppError');

/**
 * Middleware kiểm tra quyền động (Dynamic RBAC)
 * @param {String} resource - Tài nguyên (VD: 'PROJECT', 'TASK')
 * @param {String} action - Hành động (VD: 'CREATE', 'DELETE')
 * @param {String} scope - Cấp độ ('SYSTEM' hoặc 'PROJECT')
 */
const requirePermission = (resource, action, scope = 'SYSTEM') => {
    return async (req, res, next) => {
        try {
            const userId = req.user.id;
            let userRoles = [];

            // 1. LẤY ROLE & PERMISSIONS DỰA TRÊN SCOPE
            if (scope === 'SYSTEM') {
                const user = await User.findById(userId).populate({
                    path: 'system_role_ids',
                    populate: { path: 'permission_ids' } // ✅ Đã sửa chuẩn theo schema
                }).lean();
                
                if (user && user.system_role_ids) {
                    userRoles = user.system_role_ids;
                }
            } else if (scope === 'PROJECT') {
                // Lấy ID dự án từ URL params (/:id hoặc /:projectId) hoặc từ Body
                const projectId = req.params.id || req.params.projectId || req.body.projectId;
                if (!projectId) {
                    throw new AppError('Project ID is required for project-level permission check', 400);
                }

                const member = await ProjectMember.findOne({ project_id: projectId, user_id: userId })
                    .populate({
                        path: 'role_id',
                        populate: { path: 'permission_ids' } // ✅ Đã sửa chuẩn theo schema
                    }).lean();

                if (member && member.role_id) {
                    userRoles = [member.role_id];
                } else {
                    throw new AppError('You are not a member of this project', 403, 'FORBIDDEN');
                }
            }

            // 2. KIM BÀI MIỄN TỬ: SYSTEM_ADMIN CÓ TOÀN QUYỀN
            const isSystemAdmin = userRoles.some(role => role.name === 'SYSTEM_ADMIN');
            if (isSystemAdmin) {
                return next(); // Cho qua ngay lập tức
            }

            // 3. KIỂM TRA QUYỀN (DYNAMIC CHECK)
            // Gộp tất cả permission từ các role mà user đang có
            const userPermissions = userRoles.flatMap(role => role.permission_ids || []); // ✅ Đã sửa chuẩn theo schema

            // Tìm xem có permission nào khớp với yêu cầu của API không
            const hasPermission = userPermissions.some(
                p => p.resource === resource && p.action === action && p.scope === scope
            );

            if (!hasPermission) {
                throw new AppError(`Forbidden: Missing ${action} permission for ${resource}`, 403, 'FORBIDDEN');
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

module.exports = requirePermission;