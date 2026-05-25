const User = require("../../user/models/user.model");
const ProjectMember = require("../../projectMember/models/projectMember.model");
const AppError = require("../../../common/exceptions/AppError");

const requirePermission = (resource, action, scope = "SYSTEM") => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;
      let userRoles = [];

      // 1. LẤY KIM BÀI BẰNG TRƯỜNG "role_id" CỦA JAVA
      const user = await User.findById(userId)
        .populate({
          path: "role_id",
          populate: { path: "permission_ids" },
        })
        .lean();

      if (!user || user.status === 'INACTIVE') {
          throw new AppError('Account is inactive or not found', 403, 'FORBIDDEN');
      }

      // Bọc role_id vào mảng an toàn
      const systemRoles = user.role_id ? [user.role_id] : [];
      
      // 🚀 THÊM DẤU `?.` ĐỂ CHỐNG CRASH NẾU ROLE BỊ XÓA DƯỚI DB NHƯNG USER VẪN ĐANG GẮN ID ĐÓ
      const isSystemAdmin = systemRoles.some(
        (role) => role?.name === "SYSTEM_ADMIN"
      );

      if (isSystemAdmin) {
        return next();
      }

      // 2. KIỂM TRA THEO SCOPE
      if (scope === "SYSTEM") {
        userRoles = systemRoles;
      } else if (scope === "PROJECT") {
        const projectId =
          req.params.id ||
          req.params.projectId ||
          req.body.projectId ||
          req.body.project_id;

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
            path: "role_id", 
            populate: { path: "permission_ids" },
          })
          .lean();

        // 🚀 BƠM DÒNG NÀY VÀO ĐỂ SOI:
        console.log("🕵️‍♂️ THÔNG TIN MEMBER LẤY TỪ DB:", JSON.stringify(member, null, 2));

if (!member || !member.role_ids) {
  throw new AppError("You are not a member...", 403);
}

        // Kiểm tra an toàn xem member có tồn tại và có role không
    

        userRoles = [member.role_id];
      }

      // 3. KIỂM TRA QUYỀN ĐỘNG
      // 🚀 Dùng `?.` để đề phòng mảng permission_ids bị rỗng hoặc null
      const userPermissions = userRoles.flatMap(
        (role) => role?.permission_ids || []
      );
      
      const hasPermission = userPermissions.some(
        (p) =>
          p?.resource === resource && p?.action === action && p?.scope === scope
      );

      if (!hasPermission) {
        throw new AppError(
          `Forbidden: Missing ${action} permission for ${resource} at ${scope} scope`,
          403,
          "FORBIDDEN"
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = requirePermission;