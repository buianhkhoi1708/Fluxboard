const emailService = require('../../email/services/email.service');
const socketConfig = require('../../../common/config/socket');
const User = require('../../user/models/user.model');
const Task = require('../../task/models/task.model');

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

// Helper dispatch
const dispatch = async (userId, title, message, emailHtml) => {
    const user = await User.findById(userId).select('email full_name').lean();
    if (!user) return;

    const io = socketConfig.getIo();
    io.to(userId.toString()).emit('system_notification', { title, message });

    if (emailHtml) {
        emailService.sendEmail(user.email, title, emailHtml).catch(err => console.error('Email Error:', err));
    }
};

// ==========================================
// 1. EXTENSION REQUEST (Manager & Employee)
// ==========================================
exports.dispatchExtensionRequest = async (payload) => {
    const task = await Task.findById(payload.taskId).lean();
    const managerId = task.board_id; 
    
    // 📩 TO MANAGER (Orange - Warning)
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
    await dispatch(managerId, 'New Extension Request', `Employee requested a deadline extension for Task: ${task.title}`, managerHtml);

    // 📩 TO EMPLOYEE - Confirmation (Blue)
    const employeeHtml = getBaseTemplate('#3B82F6', 'Request Submitted', `
        <p>Hi,</p>
        <p>The system has recorded your deadline extension request and forwarded it to the Project Manager.</p>
        <div style="background-color: #EFF6FF; padding: 15px; border-left: 4px solid #2563EB; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #1E3A8A;"><strong>Task:</strong> ${task.title}</p>
            <p style="margin: 10px 0 0 0; color: #1E40AF;"><strong>Proposed Deadline:</strong> ${new Date(payload.newDueDate).toLocaleString('en-US')}</p>
        </div>
        <p>While waiting for approval, your original deadline remains unchanged. Please check your email for the result.</p>
    `);
    await dispatch(payload.userId, 'Extension Request Submitted', `You have submitted a deadline extension request for Task: ${task.title}`, employeeHtml);
};

// ==========================================
// 2. EXTENSION APPROVED (To Employee)
// ==========================================
exports.dispatchExtensionApproved = async (payload) => {
    const task = await Task.findById(payload.taskId).lean();
    
    // 📩 APPROVED (Green)
    const html = getBaseTemplate('#10B981', 'Request Approved ✅', `
        <p>Good news,</p>
        <p>The Project Manager has <b>approved</b> your deadline extension request.</p>
        <div style="background-color: #ECFDF5; padding: 15px; border-left: 4px solid #059669; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #065F46;"><strong>Task:</strong> ${task.title}</p>
            <p style="margin: 10px 0 0 0; color: #047857; font-size: 18px;"><strong>NEW Deadline:</strong> ${new Date(payload.newDueDate).toLocaleString('en-US')}</p>
        </div>
        <p>Wishing you success in completing your work with this new timeline!</p>
    `);
                  
    await dispatch(task.assignee_id, 'Extension Approved', `Manager has approved the deadline extension for Task: ${task.title}`, html);
};

// ==========================================
// 3. EXTENSION REJECTED (To Employee)
// ==========================================
exports.dispatchExtensionRejected = async (payload) => {
    const task = await Task.findById(payload.taskId).lean();
    
    // 📩 REJECTED (Red)
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
                  
    await dispatch(task.assignee_id, 'Extension Rejected', `Manager has rejected the deadline extension for Task: ${task.title}`, html);
};