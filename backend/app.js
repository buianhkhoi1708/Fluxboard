const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");

const requestIdMiddleware = require("./src/common/middlewares/requestId.middleware");
const errorHandler = require("./src/common/middlewares/error.middleware");
const AppError = require("./src/common/exceptions/AppError");
const apiRoutes = require("./index");

const app = express();

app.use(helmet());
app.use(compression());

app.use(
  cors({
    origin: [
      process.env.CLIENT_URL,
      "http://localhost:5173",
      "https://fluxboard-g6yx.vercel.app",
      "https://fluxboard-g6yx-git-develop-buianhkhoi1708s-projects.vercel.app",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Authorization", "Content-Type"],
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(requestIdMiddleware);

app.use("/api/v1", apiRoutes);

app.use((req, res, next) => {
  next(
    new AppError(
      `Can't find ${req.originalUrl} on this server!`,
      404,
      "ROUTE_NOT_FOUND",
    ),
  );
});

// Global Error Handler
app.use(errorHandler);

module.exports = app;
