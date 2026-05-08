const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, required: true },
    reference_id: { type: mongoose.Schema.Types.ObjectId },
    is_read: { type: Boolean, default: false },
    
    status: { type: String, enum: ['PENDING', 'SENT'], default: 'SENT', index: true }, 
    send_at: { type: Date, index: true } 
    
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

module.exports = mongoose.model('Notification', notificationSchema);