require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');

const connectDB = require('./src/common/config/db');
const socketConfig = require('./src/common/config/socket');

const errorHandler = require('./src/common/middlewares/error.middleware');
const requestIdMiddleware = require('./src/common/middlewares/requestId.middleware');

// ==========================================
// IMPORT CRON JOBS 
// ==========================================
const scheduleTaskDeadlineCheck = require('./src/modules/deadline/jobs/taskDeadline.job');
require('./src/modules/notification/jobs/notificationQueue.job');

// ==========================================
// 💡 IMPORT EVENT LISTENERS (RẤT QUAN TRỌNG ĐỂ EVENTBUS HOẠT ĐỘNG)
// ==========================================
require('./src/modules/deadline/listeners/deadline.listener');
require('./src/modules/activity/listeners/deadlineActivity.listener');
require('./src/modules/notification/listeners/notification.listener');

// Import file seed RBAC
const seedRbac = require('./src/modules/rbac/scripts/rbac.seed');
const seedData = require('./src/common/scripts/seed');

const app = express();
const server = http.createServer(app);

// ==========================================
// CONNECT DATABASE
// ==========================================
connectDB();

// ==========================================
// INIT RBAC & DATA SEEDING
// ==========================================
seedRbac();
seedData();

// ==========================================
// SOCKET.IO INIT
// ==========================================
socketConfig.init(server);

// ==========================================
// CRON JOBS
// ==========================================
scheduleTaskDeadlineCheck();

console.log('Cron Jobs scheduled.');

// ==========================================
// CORS CONFIG
// ==========================================
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type']
}));

// ==========================================
// BODY PARSER
// ==========================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({
    extended: true,
    limit: '10mb'
}));

// ==========================================
// REQUEST TRACE ID
// ==========================================
app.use(requestIdMiddleware);

// ==========================================
// HEALTH CHECK
// ==========================================
app.get('/api/v1/health-check', (req, res) => {
    res.status(200).json({
        status: 'UP',
        message: 'FluxBoard Node.js Backend is running'
    });
});

// ==========================================
// API ROUTES
// ==========================================

// Authentication & Core
app.use('/api/v1/auth', require('./src/modules/auth/routes/auth.routes'));
app.use('/api/v1/users', require('./src/modules/user/routes/user.routes'));
app.use('/api/v1/rbac', require('./src/modules/rbac/routes/rbac.routes'));

// ==========================================
// PROJECTS & ORGANIZATION
// ==========================================
app.use('/api/v1/projects', require('./src/modules/projectMember/routes/projectMember.routes'));
app.use('/api/v1/projects', require('./src/modules/project/routes/project.routes'));

app.use('/api/v1/organization/departments', require('./src/modules/department/routes/department.routes'));
app.use('/api/v1/organization/teams', require('./src/modules/team/routes/team.routes'));

// ==========================================
// KANBAN CORE (Boards, Columns, Tasks)
// ==========================================
app.use('/api/v1/boards/columns', require('./src/modules/column/routes/column.routes'));
app.use('/api/v1/boards/tasks', require('./src/modules/task/routes/task.routes'));
app.use('/api/v1/boards', require('./src/modules/board/routes/board.routes'));

// AI
app.use('/api/v1/ai', require('./src/modules/ai/routes/ai.routes'));

// Media 
app.use('/api/v1/media', require('./src/modules/media/routes/media.routes'));

// 💡 Activities, Dashboard, Notifications & Deadlines
app.use('/api/v1/activities', require('./src/modules/activity/routes/activity.routes'));
app.use('/api/v1/dashboard', require('./src/modules/dashboard/routes/dashboard.routes'));
app.use('/api/v1/notifications', require('./src/modules/notification/routes/notification.routes'));
app.use('/api/v1/deadlines', require('./src/modules/deadline/routes/deadline.routes')); // THÊM CỔNG KẾT NỐI API DEADLINE

// ==========================================
// BẮT LỖI 404 (Đường dẫn không tồn tại)
// ==========================================
app.use((req, res, next) => {
    const AppError = require('./src/common/exceptions/AppError');
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404, 'ROUTE_NOT_FOUND'));
});

// ==========================================
// GLOBAL ERROR HANDLER (Trạm thu phí cuối cùng)
// ==========================================
app.use(errorHandler);

// ==========================================
// START SERVER
// ==========================================
const PORT = process.env.SERVER_PORT || 8080;

server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});