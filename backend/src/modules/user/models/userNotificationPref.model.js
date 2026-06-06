const mongoose = require("mongoose");

const prefSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    email_notifications: {
      type: Boolean,
      default: true,
      index: true,
    },

    push_notifications: {
      type: Boolean,
      default: true,
      index: true,
    },

    task_deadline_reminders: {
      type: Boolean,
      default: true,
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

prefSchema.index({ user_id: 1, email_notifications: 1 });
prefSchema.index({ user_id: 1, push_notifications: 1 });
prefSchema.index({ user_id: 1, task_deadline_reminders: 1 });

module.exports = mongoose.model("UserNotificationPref", prefSchema);
