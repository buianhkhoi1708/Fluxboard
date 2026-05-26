const express = require('express');
const cors = require('cors');
const helmet = require('helmet'); // Bảo mật HTTP headers
const compression = require('compression'); // Nén response JSON/Text

const requestIdMiddleware = require('./src/common/middlewares/requestId.middleware');
const errorHandler = require('./src/common/middlewares/error.middleware');
const AppError = require('./src/common/exceptions/AppError');
const apiRoutes = require('./index');

const app = express();

// =========================================================
// 1. CẤU HÌNH MIDDLEWARE BẢO MẬT & TỐI ƯU
// =========================================================
app.use(helmet());
app.use(compression());

// =========================================================
// 2. CẤU HÌNH CORS
// =========================================================
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173' || 'https://fluxboard-g6yx-a4lvximhp-buianhkhoi1708s-projects.vercel.app/',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Authorization', 'Content-Type']
}));

// =========================================================
// 3. BODY PARSER & REQUEST ID
// =========================================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestIdMiddleware);

// =========================================================
// 4. ĐĂNG KÝ CÁC ROUTES
// =========================================================
// Gắn tiền tố /api/v1 cho tất cả các route
app.use('/api/v1', apiRoutes);

// =========================================================
// 5. XỬ LÝ LỖI (ERROR HANDLING)
// =========================================================
// Catch 404
app.use((req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404, 'ROUTE_NOT_FOUND'));
});

// Global Error Handler
app.use(errorHandler);

module.exports = app;