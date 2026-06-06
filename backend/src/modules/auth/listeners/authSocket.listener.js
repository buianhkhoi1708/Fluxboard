const eventBus = require("../../../common/utils/eventBus");
const socketConfig = require("../../../common/config/socket");

eventBus.on("USER_REVOKED", ({ userId, reason }) => {
  const io = socketConfig.getIo();
  if (io) {
    io.to(userId.toString()).emit("FORCE_LOGOUT", {
      message: reason || "Your access has been revoked by an administrator.",
    });
    console.log(`[Socket] Force logout emitted for user: ${userId}`);
  }
});

// Lắng nghe sự kiện bị đuổi khỏi dự án cụ thể
eventBus.on("PROJECT_MEMBERSHIP_REVOKED", ({ userId, projectId }) => {
  const io = socketConfig.getIo();
  if (io) {
    io.to(userId.toString()).emit("PROJECT_REVOKED", {
      projectId,
      message: "You no longer have access to this project.",
    });
  }
});

module.exports = {};
