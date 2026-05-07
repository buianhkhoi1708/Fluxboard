const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
    // Log này của Task nào?
    task_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    
    // Ai là người thực hiện hành động này?
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
    // Hành động là gì? (VD: 'MOVED', 'UPDATED', 'CREATED')
    action: { type: String, required: true },
    
    // Mô tả chi tiết (VD: 'đã di chuyển thẻ sang cột Doing')
    details: { type: String, required: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('TaskActivity', activitySchema);