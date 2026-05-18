const eventBus = require('../../../common/utils/eventBus');
const socketConfig = require('../../../common/config/socket');

/**
 * Listener này lắng nghe các sự kiện bảo mật từ EventBus 
 * và chuyển tiếp tới người dùng thông qua Socket.io
 */

// Lắng nghe sự kiện thu hồi quyền truy cập hệ thống
eventBus.on('USER_REVOKED', ({ userId, reason }) => {
    const io = socketConfig.getIo();
    if (io) {
        // Gửi lệnh FORCE_LOGOUT tới phòng (room) của User đó
        io.to(userId.toString()).emit('FORCE_LOGOUT', {
            message: reason || 'Your access has been revoked by an administrator.'
        });
        console.log(`[Socket] Force logout emitted for user: ${userId}`);
    }
});

// Lắng nghe sự kiện bị đuổi khỏi dự án cụ thể
eventBus.on('PROJECT_MEMBERSHIP_REVOKED', ({ userId, projectId }) => {
    const io = socketConfig.getIo();
    if (io) {
        io.to(userId.toString()).emit('PROJECT_REVOKED', {
            projectId,
            message: 'You no longer have access to this project.'
        });
    }
});

module.exports = {};