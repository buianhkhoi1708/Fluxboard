const mongoose = require('mongoose');

const columnSchema = new mongoose.Schema({
    name: { type: String, required: true },
    board_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true, index: true },

    task_order_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: [] }]
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Column', columnSchema);