const mongoose = require('mongoose');

// Schema cho công việc con (Checklist)
const subtaskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    is_done: { type: Boolean, default: false }
});

const taskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    
    column_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Column', required: true, index: true },
    board_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true, index: true },
    
    assignee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' },
    start_date: { type: Date },
    due_date: { type: Date },
    estimated_days: { type: Number },
    tags: [{ type: String }],
    subtasks: [subtaskSchema]

}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

taskSchema.index({ board_id: 1, column_id: 1 });

module.exports = mongoose.model('Task', taskSchema);