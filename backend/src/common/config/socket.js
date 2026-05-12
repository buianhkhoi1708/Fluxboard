const { Server } = require('socket.io');

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

    return io;
};

exports.getIo = () => {

    if (!io) {
        throw new Error('Socket.io is not initialized');
    }

    return io;
};