const mongoose = require('mongoose');
const { ActivityAction, ActivitySource } = require('../constants/activity.enum');

const activitySchema = new mongoose.Schema({
    action: { type: String, enum: Object.values(ActivityAction), required: true },
    source: { type: String, enum: Object.values(ActivitySource), required: true },
    actor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    target_id: { type: mongoose.Schema.Types.ObjectId }, 
    target_type: { type: String }, 
    project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', index: true },
    details: { type: mongoose.Schema.Types.Mixed }, 
    ip_address: { type: String }
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

activitySchema.index({ project_id: 1, created_at: -1 });

module.exports = mongoose.model('Activity', activitySchema);