const { Server } = require('socket.io');
const eventBus = require('../utils/eventBus'); 

let io;

exports.init = (httpServer) => {

    io = new Server(httpServer, {
        cors: {
            origin: 'http://localhost:5173',
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
            credentials: true
        },
        transports: ['websocket', 'polling']
    });

    io.on('connection', (socket) => {
        // 🗑️ Đã tắt log: console.log('✅ User connected:', socket.id);

        socket.on('registerUser', (userId) => {
            if (userId) {
                socket.join(userId.toString());
                // 🗑️ Đã tắt log: console.log(`👤 Socket has entered...`);
            }
        });

        socket.on('joinBoard', (boardId) => {
            socket.join(boardId);
            // 🗑️ Đã tắt log: console.log(`📌 Socket joined board...`);
        });

        socket.on('leaveBoard', (boardId) => {
            socket.leave(boardId);
            // 🗑️ Đã tắt log: console.log(`🚪 Socket left board...`);
        });

        socket.on('disconnect', () => {
            // 🗑️ Đã tắt log: console.log('❌ User disconnected...');
        });
    });

    eventBus.on('force_logout_user', (data) => {
        // 🗑️ Đã tắt log: console.log(`⚠️ [Socket] Sending FORCE_LOGOUT...`);
        io.to(data.userId.toString()).emit('FORCE_LOGOUT', { 
            message: data.message 
        });
    });

    eventBus.on('project_access_removed', (data) => {
        // 🗑️ Đã tắt log: console.log(`ℹ️ [Socket] Sending PROJECT_REVOKED...`);
        io.to(data.userId.toString()).emit('PROJECT_REVOKED', { 
            projectId: data.projectId,
            message: data.message 
        });
    });

    return io;
};

exports.getIo = () => {
    if (!io) {
        throw new Error('Socket.io is not initialized');
    }
    return io;
};