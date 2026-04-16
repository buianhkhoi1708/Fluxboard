const socketIo = require('socket.io');

let io;

exports.init = (httpServer) => {
    io = socketIo(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST', 'PUT', 'DELETE']
        }
    });

    io.on('connection', (socket) => {
        socket.on('joinBoard', (boardId) => {
            socket.join(boardId);
        });

        socket.on('leaveBoard', (boardId) => {
            socket.leave(boardId);
        });

        socket.on('disconnect', () => {});
    });
    return io;
};

exports.getIo = () => {
    if (!io) throw new Error('Socket.io is not initialized');
    return io;
};