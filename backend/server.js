require("dotenv").config();
const http = require("http");
const mongoose = require("mongoose");

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION! 💥 Shutting down...");
  console.error(err.name, err.message, err.stack);
  process.exit(1);
});

const app = require("./app");
const connectDB = require("./src/common/config/db");
const socketConfig = require("./src/common/config/socket");

const seedRbac = require("./src/modules/rbac/scripts/rbac.seed");
const seedData = require("./src/common/scripts/seed");
const scheduleTaskDeadlineCheck = require("./src/modules/deadline/jobs/taskDeadline.job");

const server = http.createServer(app);
const io = socketConfig.init(server);
app.set("io", io);

const startServer = async () => {
  try {
    await connectDB();

    await seedRbac();
    console.log("✅ RBAC Seeding completed.");
    await seedData();
    console.log("✅ User Seeding completed.");

    require("./src/modules/notification/jobs/notificationQueue.job");
    require("./src/modules/deadline/listeners/deadline.listener");
    require("./src/modules/activity/listeners/deadlineActivity.listener");
    require("./src/modules/notification/listeners/notification.listener");
    require("./src/modules/auth/listeners/authSocket.listener");
    scheduleTaskDeadlineCheck();
    console.log("✅ Listeners & Cron Jobs scheduled.");

    const PORT = process.env.SERVER_PORT || process.env.PORT || 8000;
    server.listen(PORT, () => {
      console.log(`🚀 Fluxboard Backend is running on port ${PORT}`);
      console.log(`📡 Socket.io is ready for real-time updates.`);
    });
  } catch (error) {
    console.error("❌ Failed to start the server:", error);
    process.exit(1);
  }
};

startServer();

// =========================================================
// 4. GRACEFUL SHUTDOWN (AN TOÀN KHI SẬP HOẶC DEPLOY)
// =========================================================
process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION! 💥 Shutting down gracefully...");
  console.error(err.name, err.message);

  // Gọi hàm shutdown xịn xò bên dưới thay vì gọi thẳng server.close()
  gracefulShutdown();
});

let isShuttingDown = false; // Cờ chống gọi tắt server nhiều lần

const gracefulShutdown = async () => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log("\n🛑 SIGTERM/SIGINT RECEIVED. Shutting down gracefully...");

  // Ép buộc tắt nếu quá thời gian (10 giây)
  const forceExitTimeout = setTimeout(() => {
    console.error(
      "⚠️ Could not close connections in time, forcefully shutting down",
    );
    process.exit(1);
  }, 10000);

  try {
    // 🚀 BƯỚC 1: ĐUỔI KHÁCH CẮM CỌC (SOCKET.IO)
    const ioInstance = app.get("io");
    if (ioInstance) {
      console.log("🔌 Cắt các kết nối Socket.io...");
      ioInstance.close();
    }

    // 🚀 BƯỚC 2: CHẶT ĐỨT CÁC REQUEST ĐANG NGỒI LÌ (LONG POLLING)
    if (server.closeAllConnections) {
      server.closeAllConnections();
    }

    // 🚀 BƯỚC 3: ĐÓNG CỬA SERVER AN TOÀN
    await new Promise((resolve, reject) => {
      server.close((err) => {
        if (err) return reject(err);
        console.log("💥 HTTP server closed.");
        resolve();
      });
    });

    // 🚀 BƯỚC 4: ĐÓNG DATABASE
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close(false);
      console.log("💥 MongoDB connection closed.");
    }

    // TODO: Đóng các connection khác nếu có (Redis, RabbitMQ...)

    clearTimeout(forceExitTimeout); // Xóa hẹn giờ 10s vì đã dọn xong
    console.log("✅ Process terminated gracefully.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Có lỗi trong quá trình tắt server:", error);
    clearTimeout(forceExitTimeout);
    process.exit(1);
  }
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);
