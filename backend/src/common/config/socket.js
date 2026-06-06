const { Server } = require("socket.io");
const eventBus = require("../utils/eventBus");

let io;

exports.init = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: "http://localhost:5173",
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    socket.on("registerUser", (userId) => {
      if (userId) {
        socket.join(userId.toString());
      }
    });

    socket.on("joinBoard", (boardId) => {
      socket.join(boardId);
    });

    socket.on("leaveBoard", (boardId) => {
      socket.leave(boardId);
    });

    socket.on("disconnect", () => {});
  });

  eventBus.on("force_logout_user", (data) => {
    io.to(data.userId.toString()).emit("FORCE_LOGOUT", {
      message: data.message,
    });
  });

  eventBus.on("project_access_removed", (data) => {
    io.to(data.userId.toString()).emit("PROJECT_REVOKED", {
      projectId: data.projectId,
      message: data.message,
    });
  });

  return io;
};

exports.getIo = () => {
  if (!io) {
    throw new Error("Socket.io is not initialized");
  }
  return io;
};
