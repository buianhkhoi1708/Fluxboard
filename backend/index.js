require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http'); 
const connectDB = require('./src/common/config/db');
const socketConfig = require('./src/common/config/socket');
const errorHandler = require('./src/common/middlewares/error.middleware');
const requestIdMiddleware = require('./src/common/middlewares/requestId.middleware');

// Import Cron Job 
const scheduleTaskDeadlineCheck = require('./src/modules/notification/jobs/taskDeadline.job');

const app = express();
const server = http.createServer(app);

// Kết nối Cơ sở dữ liệu MongoDB
connectDB();

// Khởi tạo Socket.io cho Real-time
socketConfig.init(server);

// Kích hoạt Cron Jobs chạy ngầm
scheduleTaskDeadlineCheck();
console.log('Cron Jobs scheduled.');

// Cấu hình Middleware cơ bản
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Gắn bộ lọc Trace ID cho Request (Phục vụ Audit Log)
app.use(requestIdMiddleware);

// API Kiểm tra sức khỏe hệ thống
app.get('/api/v1/health-check', (req, res) => {
    res.status(200).json({ status: 'UP', message: 'FluxBoard Node.js Backend is running' });
});

// ==========================================
// ĐỊNH TUYẾN API (API ROUTES)
// ==========================================

// Core & Authentication
app.use('/api/v1/auth', require('./src/modules/auth/routes/auth.routes'));
app.use('/api/v1/users', require('./src/modules/user/routes/user.routes'));
app.use('/api/v1/rbac', require('./src/modules/rbac/routes/rbac.routes'));

// Quản lý Dự án & Bảng công việc
app.use('/api/v1/projects', require('./src/modules/project/routes/project.routes'));
app.use('/api/v1/boards', require('./src/modules/board/routes/board.routes'));

// Trí tuệ nhân tạo (AI)
app.use('/api/v1/ai', require('./src/modules/ai/routes/ai.routes'));

// Media (Upload AWS S3) & Tổ chức (Department/Team)
app.use('/api/v1/media', require('./src/modules/media/routes/media.routes'));
app.use('/api/v1/organization', require('./src/modules/organization/routes/organization.routes'));

// Nhật ký hoạt động & Thống kê
app.use('/api/v1/activities', require('./src/modules/activity/routes/activity.routes'));
app.use('/api/v1/dashboard', require('./src/modules/dashboard/routes/dashboard.routes'));

// ==========================================
// Global Error Handler 
// ==========================================
app.use(errorHandler);

const PORT = process.env.SERVER_PORT || 8080;

// Khởi chạy máy chủ HTTP (Tích hợp cả Express và WebSocket)
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});