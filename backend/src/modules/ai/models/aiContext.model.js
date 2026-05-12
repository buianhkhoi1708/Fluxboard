const mongoose = require('mongoose');

const aiContextSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    prompt_text: { type: String, required: true },
    context_type: { type: String, enum: ['GENERATE_BOARD', 'GENERATE_INSIGHTS'], required: true },
    status: { type: String, enum: ['SUCCESS', 'FAILED'], default: 'SUCCESS' }
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

module.exports = mongoose.model('AiContext', aiContextSchema);