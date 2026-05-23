const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    owner_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, default: 'ACTIVE' },
    is_deleted: { type: Boolean, default: false } // 💡 BỔ SUNG TRƯỜNG NÀY
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Project', projectSchema);