const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
    task_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    file_name: { type: String, required: true },
    file_url: { type: String, required: true }, 
    mime_type: { type: String }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Attachment', attachmentSchema);