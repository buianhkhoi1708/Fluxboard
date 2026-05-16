const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    // Bình luận này thuộc về Task nào?
    task_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    
    // Ai là người viết bình luận này?
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
    // Nội dung bình luận
    content: { type: String, required: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Comment', commentSchema);