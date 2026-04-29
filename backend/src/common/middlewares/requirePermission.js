const User = require('../../modules/user/models/user.model');
const ProjectMember = require('../../modules/project/models/projectMember.model');
const AppError = require('../exceptions/AppError');

/**
 * @param {String} resource - Tài nguyên (VD: 'PROJECT')
 * @param {String} action - Hành động (VD: 'CREATE')
 * @param {String} scope - Phạm vi ('SYSTEM' hoặc 'PROJECT')
 */
const requirePermission = (resource, action, scope = 'SYSTEM') => {
    return async (req, res, next) => {
        try {
            const userId = req.user.id;

            // 1. LẤY ROLE CỦA USER DỰA TRÊN SCOPE
            let userRoles = [];
            if (scope === 'SYSTEM') {
                // Nếu check quyền hệ thống, lấy role từ bảng User
                const user = await User.findById(userId).populate({
                    path: 'system_role_ids',
                    populate: { path: 'permissions' } // Lấy luôn chi tiết permission bên trong
                }).lean();
                
                if (user && user.system_role_ids) {
                    userRoles = user.system_role_ids;
                }
            } else if (scope === 'PROJECT') {
                // Nếu check quyền dự án, phải lấy role từ bảng ProjectMember dựa vào projectId trên URL
                const projectId = req.params.projectId || req.body.projectId;
                if (!projectId) throw new AppError('Project ID is missing for permission check', 400);

                const member = await ProjectMember.findOne({ project_id: projectId, user_id: userId })
                    .populate({
                        path: 'role_id',
                        populate: { path: 'permissions' }
                    }).lean();

                if (member && member.role_id) {
                    userRoles = [member.role_id];
                }
            }

            // 2. NGOẠI LỆ CHO SYSTEM_ADMIN (Luôn luôn cho qua)
            const isSystemAdmin = userRoles.some(role => role.name === 'SYSTEM_ADMIN');
            if (isSystemAdmin) {
                return next(); // Cho phép đi tiếp luôn, không cần check mảng permission
            }

            // 3. KIỂM TRA QUYỀN ĐỘNG (Lõi của việc làm code "Sống")
            // Gộp tất cả permission từ các roles mà user đang có thành 1 mảng dẹt
            const userPermissions = userRoles.flatMap(role => role.permissions || []);

            // Check xem trong đống permission đó có cái nào khớp với yêu cầu của API không
            const hasPermission = userPermissions.some(
                p => p.resource === resource && p.action === action
            );

            if (!hasPermission) {
                throw new AppError(`You do not have permission to ${action} ${resource}`, 403, 'FORBIDDEN');
            }

            // Đủ quyền thì cho đi qua hàm Controller
            next();
        } catch (error) {
            next(error);
        }
    };
};

module.exports = requirePermission;