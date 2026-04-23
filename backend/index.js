require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http'); // Yêu cầu cho socket.io
const connectDB = require('./src/common/config/db');
const socketConfig = require('./src/common/config/socket');
const errorHandler = require('./src/common/middlewares/error.middleware');
const requestIdMiddleware = require('./src/common/middlewares/requestId.middleware');

const app = express();
const server = http.createServer(app);

connectDB();

// Khởi tạo Socket.io
socketConfig.init(server);

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Gắn bộ lọc ID Request
app.use(requestIdMiddleware);

app.get('/api/v1/health-check', (req, res) => {
    res.status(200).json({ status: 'UP', message: 'FluxBoard Node.js Backend is running' });
});

app.use('/api/v1/auth', require('./src/modules/auth/routes/auth.routes'));
app.use('/api/v1/users', require('./src/modules/user/routes/user.routes')); 
app.use('/api/v1/rbac', require('./src/modules/rbac/routes/rbac.routes'));
app.use('/api/v1/boards', require('./src/modules/board/routes/board.routes'));
app.use('/api/v1/ai', require('./src/modules/ai/routes/ai.routes'));
app.use('/api/v1/projects', require('./src/modules/project/routes/project.routes'));

app.use(errorHandler);

const PORT = process.env.SERVER_PORT || 8080;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});