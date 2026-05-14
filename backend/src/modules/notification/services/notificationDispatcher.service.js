const emailService = require('../../email/services/email.service');
const socketConfig = require('../../../common/config/socket');
const User = require('../../user/models/user.model');
const Task = require('../../task/models/task.model');

// Hàm Helper gửi Email & Socket chung
const dispatch = async (userId, title, message, emailHtml) => {
    const user = await User.findById(userId).select('email full_name').lean();
    if (!user) return;

    // Gửi Socket Real-time
    const io = socketConfig.getIo();
    io.to(userId.toString()).emit('system_notification', { title, message });

    // Gửi Email
    if (emailHtml) {
        emailService.sendEmail(user.email, title, emailHtml).catch(err => console.error('Email Error:', err));
    }
};

// 1. Phân phối: Nhận yêu cầu xin dời (Gửi cho Manager/PM)
exports.dispatchExtensionRequest = async (payload) => {
    const task = await Task.findById(payload.taskId).lean();
    // Giả sử lấy Manager ID từ Project hoặc Board (Bạn custom logic lấy Manager nhé)
    const managerId = task.board_id; // Thay bằng logic lấy PM của bạn
    
    const html = `<h2>Yêu cầu dời hạn (Extension Request)</h2>
                  <p>Task: <b>${task.title}</b></p>
                  <p>Lý do: ${payload.reason}</p>
                  <p>Hạn mới đề xuất: ${new Date(payload.newDueDate).toLocaleString()}</p>`;
                  
    await dispatch(managerId, 'New Extension Request', `Nhân viên xin dời hạn Task: ${task.title}`, html);
};

// 2. Phân phối: Được duyệt (Gửi cho Nhân viên)
exports.dispatchExtensionApproved = async (payload) => {
    const task = await Task.findById(payload.taskId).lean();
    const html = `<h2>Yêu cầu dời hạn được chấp thuận ✅</h2>
                  <p>Task: <b>${task.title}</b></p>
                  <p>Hạn chót mới của bạn là: ${new Date(payload.newDueDate).toLocaleString()}</p>`;
                  
    await dispatch(task.assignee_id, 'Extension Approved', `Sếp đã duyệt dời hạn Task: ${task.title}`, html);
};

// 3. Phân phối: Bị từ chối (Gửi cho Nhân viên)
exports.dispatchExtensionRejected = async (payload) => {
    const task = await Task.findById(payload.taskId).lean();
    const html = `<h2>Yêu cầu dời hạn bị từ chối ❌</h2>
                  <p>Task: <b>${task.title}</b></p>
                  <p>Lý do từ chối: ${payload.rejectReason}</p>
                  <p>Vui lòng hoàn thành đúng hạn cũ!</p>`;
                  
    await dispatch(task.assignee_id, 'Extension Rejected', `Sếp đã từ chối dời hạn Task: ${task.title}`, html);
};