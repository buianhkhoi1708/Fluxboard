const User = require("../../modules/user/models/user.model");
const ProjectMember = require("../../modules/projectMember/models/projectMember.model");
const AppError = require("../exceptions/AppError");

const requirePermission = (resource, action, scope = "SYSTEM") => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;
      let userRoles = [];

      // 1. LẤY KIM BÀI BẰNG TRƯỜNG "role_id" CỦA JAVA
      const user = await User.findById(userId)
        .populate({
          path: "role_id", // Đổi cho khớp với Schema
          populate: { path: "permission_ids" },
        })
        .lean();

      // Bọc role_id vào mảng để xử lý thống nhất với cấp độ dự án
      const systemRoles = user?.role_id ? [user.role_id] : [];
      const isSystemAdmin = systemRoles.some(
        (role) => role.name === "SYSTEM_ADMIN",
      );

      if (isSystemAdmin) {
        return next();
      }

      // 2. KIỂM TRA THEO SCOPE
      if (scope === "SYSTEM") {
        userRoles = systemRoles;
      } else if (scope === "PROJECT") {
        const projectId =
          req.body?.project_id ||
          req.body?.projectId ||
          req.query?.project_id ||
          req.params?.projectId ||
          (req.originalUrl.includes('/projects') ? req.params.id : null); // Chỉ lấy :id nếu URL thuộc về projects

        if (!projectId) {
          throw new AppError(
            "Project ID is required for project-level permission check",
            400
          );
        }

       const member = await ProjectMember.findOne({
          project_id: projectId,
          user_id: userId,
        })
          .populate({
            path: "role_ids", // 🚀 ĐỔI LẠI THÀNH CHỮ 's' VÌ DB ĐANG LƯU MẢNG
            populate: { path: "permission_ids" },
          })
          .lean();

        // 🚀 Cập nhật biến này
        if (!member || !member.role_ids || member.role_ids.length === 0) {
          throw new AppError(
            "You are not a member of this project or missing role",
            403,
            "FORBIDDEN"
          );
        }

        userRoles = member.role_ids;
      }

      // 3. KIỂM TRA QUYỀN ĐỘNG
      const userPermissions = userRoles.flatMap(
        (role) => (role && role.permission_ids) ? role.permission_ids : []
      );
      
      const hasPermission = userPermissions.some(
        (p) =>
          p && p.resource === resource && p.action === action && p.scope === scope
      );


      if (!hasPermission) {
        throw new AppError(
          `Forbidden: Missing ${action} permission for ${resource} at ${scope} scope`,
          403,
          "FORBIDDEN",
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = requirePermission;
