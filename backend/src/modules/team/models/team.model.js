const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true }, // Ví dụ: IT-BE, IT-FE
    department_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
    lead_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    is_deleted: { type: Boolean, default: false }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Team', teamSchema);