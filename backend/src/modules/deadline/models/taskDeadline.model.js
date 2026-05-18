const mongoose = require('mongoose');

const taskDeadlineSchema = new mongoose.Schema({
    task_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true, unique: true },
    
    start_date: { type: Date },
    due_date: { type: Date, required: true },
    actual_completed_at: { type: Date, default: null },

    // 💡 1. CHỐNG SPAM GIA HẠN
    extension_limit: { type: Number, default: 2 }, 
    extension_count: { type: Number, default: 0 },
    extension_status: { 
        type: String, 
        enum: ['NONE', 'PENDING', 'APPROVED', 'REJECTED'], 
        default: 'NONE' 
    },
    pending_due_date: { type: Date, default: null }, 
    
    // 💡 2. CỜ BÁO QUÉT CRONJOB (Chỉ gửi 1 lần)
    reminder_sent: { type: Boolean, default: false },
    is_overdue: { type: Boolean, default: false },

    // 💡 3. TRẠNG THÁI HOÀN THÀNH (Đúng hạn hay Trễ hẹn)
    completion_status: { type: String, enum: ['PENDING', 'ON_TIME', 'LATE'], default: 'PENDING' },
    late_minutes: { type: Number, default: 0 },

    is_deleted: { type: Boolean, default: false }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// Đánh Index để tối ưu truy vấn CronJob
taskDeadlineSchema.index({ due_date: 1, is_overdue: 1, reminder_sent: 1 });

module.exports = mongoose.model('TaskDeadline', taskDeadlineSchema);