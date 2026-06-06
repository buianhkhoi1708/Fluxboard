const mongoose = require("mongoose");

const taskDeadlineSchema = new mongoose.Schema(
  {
    task_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      unique: true,
      index: true,
    },

    start_date: {
      type: Date,
      default: null,
    },

    due_date: {
      type: Date,
      required: true,
      index: true,
    },

    actual_completed_at: {
      type: Date,
      default: null,
    },

    extension_limit: {
      type: Number,
      default: 2,
      min: 0,
    },

    extension_count: {
      type: Number,
      default: 0,
      min: 0,
    },

    extension_status: {
      type: String,
      enum: ["NONE", "PENDING", "APPROVED", "REJECTED"],
      default: "NONE",
      index: true,
    },

    pending_due_date: {
      type: Date,
      default: null,
    },

    extension_requested_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    extension_requested_at: {
      type: Date,
      default: null,
    },

    extension_reason: {
      type: String,
      default: "",
      trim: true,
    },

    extension_reviewed_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    extension_reviewed_at: {
      type: Date,
      default: null,
    },

    extension_reject_reason: {
      type: String,
      default: "",
      trim: true,
    },

    reminder_sent: {
      type: Boolean,
      default: false,
      index: true,
    },

    is_overdue: {
      type: Boolean,
      default: false,
      index: true,
    },

    completion_status: {
      type: String,
      enum: ["PENDING", "ON_TIME", "LATE"],
      default: "PENDING",
      index: true,
    },

    late_minutes: {
      type: Number,
      default: 0,
      min: 0,
    },

    is_deleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
);

taskDeadlineSchema.index({ due_date: 1, is_overdue: 1, reminder_sent: 1 });

taskDeadlineSchema.index({ extension_status: 1, extension_requested_by: 1 });

taskDeadlineSchema.index({ extension_status: 1, extension_requested_at: -1 });

taskDeadlineSchema.index({ task_id: 1, is_deleted: 1 });

module.exports = mongoose.model("TaskDeadline", taskDeadlineSchema);
