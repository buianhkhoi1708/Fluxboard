const mongoose = require('mongoose');

const boardSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Board', boardSchema);