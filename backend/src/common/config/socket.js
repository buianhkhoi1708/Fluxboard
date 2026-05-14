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
        console.log('✅ User connected:', socket.id);

        // ================================
        // 1. REGISTER PRIVATE ROOM
        // Frontend emits this right after successful login
        // ================================
        socket.on('registerUser', (userId) => {
            if (userId) {
                socket.join(userId.toString());
                console.log(`👤 Socket ${socket.id} has entered the private room: ${userId}`);
            }
        });

        // ================================
        // JOIN BOARD ROOM
        // ================================
        socket.on('joinBoard', (boardId) => {
            socket.join(boardId);
            console.log(`📌 Socket ${socket.id} joined board ${boardId}`);
        });

        // ================================
        // LEAVE BOARD ROOM
        // ================================
        socket.on('leaveBoard', (boardId) => {
            socket.leave(boardId);
            console.log(`🚪 Socket ${socket.id} left board ${boardId}`);
        });

        // ================================
        // DISCONNECT
        // ================================
        socket.on('disconnect', () => {
            console.log('❌ User disconnected:', socket.id);
        });
    });

    // ================================
    // 2. LISTEN TO SYSTEM EVENTS (FORCE LOGOUT)
    // ================================
    eventBus.on('force_logout_user', (data) => {
        console.log(`⚠️ [Socket] Sending FORCE_LOGOUT command to User ID: ${data.userId}`);
        io.to(data.userId.toString()).emit('FORCE_LOGOUT', { 
            message: data.message 
        });
    });

    // ================================
    // 3. LISTEN TO SYSTEM EVENTS (SILENT REVOKE)
    // ================================
    eventBus.on('project_access_removed', (data) => {
        console.log(`ℹ️ [Socket] Sending PROJECT_REVOKED command to User ID: ${data.userId}`);
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