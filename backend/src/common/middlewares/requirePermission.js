const User = require("../../modules/user/models/user.model");
const ProjectMember = require("../../modules/projectMember/models/projectMember.model");
const AppError = require("../../common/exceptions/AppError"); // Sếp check lại đường dẫn file Error này nha
const mongoose = require("mongoose");

const requirePermission = (resource, action, scope = "SYSTEM") => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;
      let userRoles = [];

      // ==========================================
      // 1. LẤY KIM BÀI TỪ BẢNG USER (SYSTEM SCOPE)
      // ==========================================
      const user = await User.findById(userId)
        .populate({
          path: "role_id", 
          strictPopulate: false, // 🚀 BÙA 1: Trị Mongoose gào thét ở User
          populate: { path: "permission_ids" },
        })
        .lean();

      if (!user || user.status === 'INACTIVE') {
          throw new AppError('Account is inactive or not found', 403, 'FORBIDDEN');
      }

      const systemRoles = user.role_id ? [user.role_id] : [];
      const isSystemAdmin = systemRoles.some((role) => role?.name === "SYSTEM_ADMIN");

      if (isSystemAdmin) {
        return next();
      }

      // ==========================================
      // 2. KIỂM TRA THEO SCOPE PROJECT
      // ==========================================
      if (scope === "SYSTEM") {
        userRoles = systemRoles;
      } else if (scope === "PROJECT") {
        // 🚀 FIX TỬ HUYỆT: Đã dời req.params.id xuống cuối cùng để không lấy nhầm Board ID
        const projectId =
          req.params?.projectId ||
          req.body?.projectId ||
          req.body?.project_id ||
          req.query?.project_id ||
          req.query?.projectId ||
          (req.originalUrl?.includes('/projects') ? req.params?.id : null);

        if (!projectId) {
          throw new AppError("Project ID is required for project-level permission check", 400);
        }

       const member = await ProjectMember.findOne({
          project_id: new mongoose.Types.ObjectId(projectId),
          user_id: new mongoose.Types.ObjectId(userId),
        })
          .populate({
            path: "role_ids", // Giữ nguyên số nhiều của Sếp
            strictPopulate: false, // 🚀 BÙA 2: Chống Mongoose gào thét
            populate: { path: "permission_ids" },
          })
          .lean();

        if (!member || !member.role_ids || member.role_ids.length === 0) {
          throw new AppError(
            "You are not a member of this project or missing role",
            403,
            "FORBIDDEN"
          );
        }

        userRoles = member.role_ids; 
      }
      
      // ==========================================
      // 3. KIỂM TRA QUYỀN ĐỘNG
      // ==========================================
      const userPermissions = userRoles.flatMap(
        (role) => role?.permission_ids || []
      );
      
      const hasPermission = userPermissions.some(
        (p) => p?.resource === resource && p?.action === action && p?.scope === scope
      );

      if (!hasPermission) {
        throw new AppError(`Forbidden: Missing ${action} permission for ${resource} at ${scope} scope`, 403, "FORBIDDEN");
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = requirePermission;