const User = require('../../user/models/user.model');
const Task = require('../../task/models/task.model');
const Column = require('../../column/models/column.model'); 
const notificationService = require('./notification.service'); 

// ==========================================
// 💡 BASE TEMPLATE (100% ENGLISH)
// ==========================================
const getBaseTemplate = (color, title, bodyContent) => `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);">
    <div style="background-color: ${color}; padding: 25px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px; letter-spacing: 1px;">${title}</h1>
    </div>
    <div style="padding: 35px; background-color: #ffffff; color: #333333; line-height: 1.6; font-size: 16px;">
        ${bodyContent}
    </div>
    <div style="background-color: #f9fafb; padding: 20px; text-align: center; font-size: 13px; color: #6b7280; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0;">This is an automated email from the project management system.</p>
        <p style="margin: 5px 0 0 0;">Please do not reply to this email.</p>
    </div>
</div>
`;

const dispatch = async (userId, title, message, emailHtml, type = 'SYSTEM', referenceId = null) => {
    if (!userId) return; 

    await notificationService.queueNotification({
        recipient_id: userId,
        title: title,
        message: message,
        type: type,
        reference_id: referenceId,
        email_html: emailHtml 
    });
};

// ==========================================
// 1. EXTENSION REQUEST (Manager & Employee)
// ==========================================
exports.dispatchExtensionRequest = async (payload) => {
    // 1. Móc dữ liệu từ Task lên Board lên tận Project
    const task = await Task.findById(payload.taskId).populate({
        path: 'board_id',
        populate: { path: 'project_id' }
    }).lean();
    
    // 2. LOGIC CHUẨN: Tự động tìm Sếp (người sở hữu hoặc người tạo dự án)
    let managerId = task?.board_id?.project_id?.owner_id || task?.board_id?.project_id?.created_by;

    // 3. Nếu dự án bị lỗi không có owner thì ngắt luôn, không ép cứng gì cả!
    if (!managerId) {
        console.error(`[Notification] Skipped: No owner/manager of the project containing the task was found. ${task.title}`);
        return; 
    }
    
    const managerHtml = getBaseTemplate('#F59E0B', 'New Extension Request', `
        <p>Dear Manager,</p>
        <p>An employee has submitted a deadline extension request for the following task:</p>
        <div style="background-color: #FEF3C7; padding: 15px; border-left: 4px solid #D97706; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #92400E;"><strong>Task:</strong> ${task.title}</p>
            <p style="margin: 10px 0 0 0; color: #92400E;"><strong>Original Deadline:</strong> ${new Date(payload.originalDueDate).toLocaleString('en-US')}</p>
            <p style="margin: 10px 0 0 0; color: #B45309;"><strong>Proposed Deadline:</strong> ${new Date(payload.newDueDate).toLocaleString('en-US')}</p>
            <p style="margin: 10px 0 0 0; color: #92400E;"><strong>Reason:</strong> <i>"${payload.reason}"</i></p>
        </div>
        <p>Please log in to the system to Approve or Reject this request.</p>
    `);
    await dispatch(managerId, 'New Extension Request', `Employee requested a deadline extension for Task: ${task.title}`, managerHtml, 'EXTENSION_REQUEST', task._id);

    const employeeHtml = getBaseTemplate('#3B82F6', 'Request Submitted', `
        <p>Hi,</p>
        <p>The system has recorded your deadline extension request and forwarded it to the Project Manager.</p>
        <div style="background-color: #EFF6FF; padding: 15px; border-left: 4px solid #2563EB; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #1E3A8A;"><strong>Task:</strong> ${task.title}</p>
            <p style="margin: 10px 0 0 0; color: #1E40AF;"><strong>Proposed Deadline:</strong> ${new Date(payload.newDueDate).toLocaleString('en-US')}</p>
        </div>
        <p>While waiting for approval, your original deadline remains unchanged. Please check your email for the result.</p>
    `);
    await dispatch(payload.userId, 'Extension Request Submitted', `You have submitted a deadline extension request for Task: ${task.title}`, employeeHtml, 'EXTENSION_REQUEST', task._id);
};

// ==========================================
// 2. EXTENSION APPROVED (To Employee)
// ==========================================
exports.dispatchExtensionApproved = async (payload) => {
    const task = await Task.findById(payload.taskId).lean();
    if (!task || !task.assignee_id) return;
    
    const html = getBaseTemplate('#10B981', 'Request Approved ✅', `
        <p>Good news,</p>
        <p>The Project Manager has <b>approved</b> your deadline extension request.</p>
        <div style="background-color: #ECFDF5; padding: 15px; border-left: 4px solid #059669; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #065F46;"><strong>Task:</strong> ${task.title}</p>
            <p style="margin: 10px 0 0 0; color: #047857; font-size: 18px;"><strong>NEW Deadline:</strong> ${new Date(payload.newDueDate).toLocaleString('en-US')}</p>
        </div>
        <p>Wishing you success in completing your work with this new timeline!</p>
    `);
    await dispatch(task.assignee_id, 'Extension Approved', `Manager has approved the deadline extension for Task: ${task.title}`, html, 'EXTENSION_APPROVE', task._id);
};

// ==========================================
// 3. EXTENSION REJECTED (To Employee)
// ==========================================
exports.dispatchExtensionRejected = async (payload) => {
    const task = await Task.findById(payload.taskId).lean();
    if (!task || !task.assignee_id) return;
    
    const html = getBaseTemplate('#EF4444', 'Request Rejected ❌', `
        <p>Hi,</p>
        <p>The Project Manager has reviewed but <b>rejected</b> your deadline extension request.</p>
        <div style="background-color: #FEF2F2; padding: 15px; border-left: 4px solid #DC2626; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #991B1B;"><strong>Task:</strong> ${task.title}</p>
            <p style="margin: 10px 0 0 0; color: #991B1B;"><strong>Reason for rejection:</strong> <i>"${payload.rejectReason}"</i></p>
        </div>
        <div style="background-color: #FFFBEB; padding: 15px; margin-top: 15px; border-radius: 4px; border: 1px dashed #F59E0B;">
            <p style="margin: 0; color: #B45309; text-align: center;">
                ⚠️ <strong>Note:</strong> Your original deadline is still <b>${new Date(payload.originalDueDate).toLocaleString('en-US')}</b>. Please plan to complete it on time!
            </p>
        </div>
    `);
    await dispatch(task.assignee_id, 'Extension Rejected', `Manager has rejected the deadline extension for Task: ${task.title}`, html, 'EXTENSION_REJECT', task._id);
};

// ==========================================
// 4. THÊM MỚI: TASK UPDATED (To Assignee)
// ==========================================
exports.dispatchTaskUpdated = async (payload) => {
    const task = await Task.findById(payload.taskId).lean();
    if (!task || !task.assignee_id) return; 

    const html = getBaseTemplate('#6366F1', 'Task Updated 📝', `
        <p>Hi,</p>
        <p>There have been some updates to a task assigned to you.</p>
        <div style="background-color: #EEF2FF; padding: 15px; border-left: 4px solid #4F46E5; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #3730A3;"><strong>Task:</strong> ${task.title}</p>
        </div>
        <p>Please log in to the system to check the latest details.</p>
    `);
    await dispatch(task.assignee_id, 'Task Updated', `Task details have been updated: ${task.title}`, html, 'TASK_UPDATE', task._id);
};

// ==========================================
// 5. THÊM MỚI: TASK MOVED / DRAG & DROP (To Assignee)
// ==========================================
exports.dispatchTaskMoved = async (payload) => {
    const task = await Task.findById(payload.taskId).lean();
    if (!task || !task.assignee_id) return;

    // Lấy tên cột mới
    const column = await Column.findById(payload.destColumnId).lean();
    const colName = column ? column.title : 'another column';

    const html = getBaseTemplate('#8B5CF6', 'Task Status Changed 🚀', `
        <p>Hi,</p>
        <p>A task assigned to you has been moved to a new stage.</p>
        <div style="background-color: #F5F3FF; padding: 15px; border-left: 4px solid #7C3AED; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #5B21B6;"><strong>Task:</strong> ${task.title}</p>
            <p style="margin: 10px 0 0 0; color: #5B21B6;"><strong>New Status:</strong> ${colName}</p>
        </div>
        <p>Keep up the great work!</p>
    `);
    await dispatch(task.assignee_id, 'Task Status Changed', `Task moved to ${colName}: ${task.title}`, html, 'TASK_MOVE', task._id);
};