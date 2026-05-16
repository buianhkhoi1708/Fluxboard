const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true }, 
    description: { type: String },
    manager_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    is_deleted: { type: Boolean, default: false }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Department', departmentSchema);