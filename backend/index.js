require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');

const connectDB = require('./src/common/config/db');
const socketConfig = require('./src/common/config/socket');

const errorHandler = require('./src/common/middlewares/error.middleware');
const requestIdMiddleware = require('./src/common/middlewares/requestId.middleware');

// ==========================================
// 1. IMPORT CRON JOBS 
// ==========================================
const scheduleTaskDeadlineCheck = require('./src/modules/deadline/jobs/taskDeadline.job');
require('./src/modules/notification/jobs/notificationQueue.job');

// ==========================================
// 2. IMPORT EVENT LISTENERS (RẤT QUAN TRỌNG ĐỂ EVENT-DRIVEN HOẠT ĐỘNG)
// ==========================================
require('./src/modules/deadline/listeners/deadline.listener');
require('./src/modules/activity/listeners/deadlineActivity.listener');
require('./src/modules/notification/listeners/notification.listener');
// Listener xử lý bảo mật, thu hồi quyền và logout real-time
require('./src/modules/auth/listeners/authSocket.listener'); 

const seedRbac = require('./src/modules/rbac/scripts/rbac.seed');
const seedData = require('./src/common/scripts/seed');

const app = express();
const server = http.createServer(app);

// ==========================================
// 3. CONNECT DATABASE & INIT RBAC
// ==========================================
connectDB();

(async () => {
    try {
        await seedRbac();
        console.log('✅ RBAC Seeding completed.');
        // await seedData(); // Mở nếu muốn seed dữ liệu mẫu cho hệ thống
    } catch (err) {
        console.error('❌ Seeding error:', err);
    }
})();

// ==========================================
// 4. CHẠY CRON JOBS
// ==========================================
scheduleTaskDeadlineCheck();
console.log('✅ Cron Jobs scheduled.');

// ==========================================
// 5. CẤU HÌNH SYSTEM MIDDLEWARES
// ==========================================
app.use(requestIdMiddleware);

// Cấu hình CORS chi tiết để khớp với môi trường Frontend (Vite)
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type']
}));

// Cấu hình Body Parser với giới hạn 10MB (Quan trọng cho AI context và metadata file)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({
    extended: true,
    limit: '10mb'
}));

// ==========================================
// 6. SETUP SOCKET.IO (REAL-TIME CORE)
// ==========================================
const io = socketConfig.init(server);
app.set('socketio', io); // Gán vào app để các controller có thể truy cập qua req.app.get('socketio')

// ==========================================
// 7. ĐĂNG KÝ CÁC ROUTES (API V1)
// ==========================================

// --- Phân hệ Auth, User & Phân quyền ---
app.use('/api/v1/auth', require('./src/modules/auth/routes/auth.routes'));
app.use('/api/v1/users', require('./src/modules/user/routes/user.routes'));
app.use('/api/v1/rbac', require('./src/modules/rbac/routes/rbac.routes'));

// --- Phân hệ Cơ cấu Tổ chức (Đợt 1) ---
app.use('/api/v1/departments', require('./src/modules/department/routes/department.routes'));
app.use('/api/v1/teams', require('./src/modules/team/routes/team.routes'));
app.use('/api/v1/organization', require('./src/modules/organization/routes/organization.routes'));

// --- Phân hệ Dự án & Kanban ---
app.use('/api/v1/projects', require('./src/modules/project/routes/project.routes'));
app.use('/api/v1/project-members', require('./src/modules/projectMember/routes/projectMember.routes'));
app.use('/api/v1/columns', require('./src/modules/column/routes/column.routes'));
app.use('/api/v1/tasks', require('./src/modules/task/routes/task.routes'));
app.use('/api/v1/boards', require('./src/modules/board/routes/board.routes'));

// --- Phân hệ AI, Media & Monitoring ---
app.use('/api/v1/ai', require('./src/modules/ai/routes/ai.routes'));
app.use('/api/v1/media', require('./src/modules/media/routes/media.routes'));
app.use('/api/v1/activities', require('./src/modules/activity/routes/activity.routes'));
app.use('/api/v1/dashboard', require('./src/modules/dashboard/routes/dashboard.routes'));
app.use('/api/v1/notifications', require('./src/modules/notification/routes/notification.routes'));
app.use('/api/v1/deadlines', require('./src/modules/deadline/routes/deadline.routes'));

// ==========================================
// 8. XỬ LÝ LỖI (ERROR HANDLING)
// ==========================================

// Bắt lỗi 404 cho các route không tồn tại
app.use((req, res, next) => {
    const AppError = require('./src/common/exceptions/AppError');
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404, 'ROUTE_NOT_FOUND'));
});

// Global Error Handler - Trạm thu phí cuối cùng xử lý mọi lỗi hệ thống
app.use(errorHandler);

// ==========================================
// 9. KHỞI CHẠY SERVER
// ==========================================
// 💡 LẤY ĐÚNG BIẾN SERVER_PORT TỪ FILE .ENV CỦA BẠN
const PORT = process.env.SERVER_PORT || process.env.PORT || 8000;

server.listen(PORT, () => {
    console.log(`🚀 Fluxboard Backend is running on port ${PORT}`);
    console.log(`📡 Socket.io is ready for real-time updates.`);
});