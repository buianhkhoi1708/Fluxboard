require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');

const connectDB = require('./src/common/config/db');
const socketConfig = require('./src/common/config/socket');
const errorHandler = require('./src/common/middlewares/error.middleware');
const requestIdMiddleware = require('./src/common/middlewares/requestId.middleware');

// ==========================================
// 1. IMPORT CRON JOBS & LISTENERS
// ==========================================
const scheduleTaskDeadlineCheck = require('./src/modules/deadline/jobs/taskDeadline.job');
require('./src/modules/notification/jobs/notificationQueue.job');

require('./src/modules/deadline/listeners/deadline.listener');
require('./src/modules/activity/listeners/deadlineActivity.listener');
require('./src/modules/notification/listeners/notification.listener');
require('./src/modules/auth/listeners/authSocket.listener'); 

const seedRbac = require('./src/modules/rbac/scripts/rbac.seed');
const seedData = require('./src/common/scripts/seed');

const app = express();
const server = http.createServer(app);

// =========================================================
// 2. CẤU HÌNH MIDDLEWARE (ĐÚNG THỨ TỰ BẮT BUỘC)
// =========================================================

// 1. CORS: PHẢI LÊN ĐẦU TIÊN để xử lý Pre-flight OPTIONS request
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Authorization', 'Content-Type']
}));

// 2. BODY PARSER: Phải đặt sau CORS và TRƯỚC mọi route để parse dữ liệu
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 3. REQUEST ID: Đặt sau Body Parser để đảm bảo body đã được xử lý xong
app.use(requestIdMiddleware);

// =========================================================
// 3. SETUP SOCKET.IO
// =========================================================
const io = socketConfig.init(server);
app.set('socketio', io);

// =========================================================
// 4. CONNECT DATABASE & INIT DATA
// =========================================================
connectDB();

(async () => {
    try {
        await seedRbac();
        console.log('✅ RBAC Seeding completed.');
        await seedData();
        console.log('✅ User Seeding completed.');
    } catch (err) {
        console.error('❌ Seeding error:', err);
    }
})();

// =========================================================
// 5. CHẠY CRON JOBS
// =========================================================
scheduleTaskDeadlineCheck();
console.log('✅ Cron Jobs scheduled.');

// =========================================================
// 6. ĐĂNG KÝ CÁC ROUTES (API V1)
// =========================================================
app.use('/api/v1/auth', require('./src/modules/auth/routes/auth.routes'));
app.use('/api/v1/users', require('./src/modules/user/routes/user.routes'));
app.use('/api/v1/rbac', require('./src/modules/rbac/routes/rbac.routes'));
app.use('/api/v1/departments', require('./src/modules/department/routes/department.routes'));
app.use('/api/v1/teams', require('./src/modules/team/routes/team.routes'));
app.use('/api/v1/organizations', require('./src/modules/organization/routes/organization.routes'));
app.use('/api/v1/projects', require('./src/modules/project/routes/project.routes'));
app.use('/api/v1/projects', require('./src/modules/projectMember/routes/projectMember.routes'));
app.use('/api/v1/columns', require('./src/modules/column/routes/column.routes'));
app.use('/api/v1/tasks', require('./src/modules/task/routes/task.routes'));
app.use('/api/v1/boards', require('./src/modules/board/routes/board.routes'));
app.use('/api/v1/ai', require('./src/modules/ai/routes/ai.routes'));
app.use('/api/v1/media', require('./src/modules/media/routes/media.routes'));
app.use('/api/v1/activities', require('./src/modules/activity/routes/activity.routes'));
app.use('/api/v1/dashboard', require('./src/modules/dashboard/routes/dashboard.routes'));
app.use('/api/v1/notifications', require('./src/modules/notification/routes/notification.routes'));
app.use('/api/v1/deadlines', require('./src/modules/deadline/routes/deadline.routes'));
app.use('/api/v1/settings', require('./src/modules/setting/routes/setting.routes'));

// =========================================================
// 7. XỬ LÝ LỖI (ERROR HANDLING)
// =========================================================
app.use((req, res, next) => {
    const AppError = require('./src/common/exceptions/AppError');
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404, 'ROUTE_NOT_FOUND'));
});

app.use(errorHandler);

// =========================================================
// 8. KHỞI CHẠY SERVER
// =========================================================
const PORT = process.env.SERVER_PORT || process.env.PORT || 8000;

server.listen(PORT, () => {
    console.log(`🚀 Fluxboard Backend is running on port ${PORT}`);
    console.log(`📡 Socket.io is ready for real-time updates.`);
});