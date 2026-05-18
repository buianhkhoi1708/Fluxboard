const EventEmitter = require('events');

const eventBus = new EventEmitter();

// Tăng số lượng listener lên (mặc định Nodejs chỉ cho 10, nếu nhiều user sẽ báo lỗi)
// Để 0 nghĩa là không giới hạn số lượng user chờ kết nối
eventBus.setMaxListeners(0); 

module.exports = eventBus;