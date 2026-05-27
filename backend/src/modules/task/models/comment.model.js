const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    task_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, trim: true },
    is_resolved: { type: Boolean, default: false, index: true },
    resolved_by_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolved_at: { type: Date, default: null }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

commentSchema.index({ task_id: 1, created_at: 1 });
commentSchema.index({ task_id: 1, is_resolved: 1 });

module.exports = mongoose.model('Comment', commentSchema);